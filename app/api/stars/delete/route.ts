import {env} from "cloudflare:workers";
import {and, eq, sql} from "drizzle-orm";
import {getDb} from "../../../../db";
import {publicStars, starReports} from "../../../../db/schema";
import {errorKind} from "../../error-kind.mjs";
import {canDelete, DELETE_LIMIT, ownsStar, parseDelete, publicStarsEnabled} from "../rules.mjs";

export async function POST(request: Request) {
  if (!publicStarsEnabled(env)) return Response.json({enabled: false}, {status: 404});
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({error: "消す星を確認してください。"}, {status: 400}); }
  const parsed = parseDelete(body);
  if (!parsed.ok) return Response.json({error: parsed.error}, {status: parsed.status});
  const {starId, orbitId} = parsed.value;
  try {
    const db = getDb();
    const now = Date.now();
    const key = `delete:${orbitId}`;
    // 失敗した操作も数え、別の Worker で同時に押しても上限を越えないようにする。
    const result = await db.get<{value: string}>(sql`INSERT INTO watch_settings (key, value, updated_at) VALUES (${key}, '1', ${now})
      ON CONFLICT(key) DO UPDATE SET value = CASE WHEN updated_at <= ${now - DELETE_LIMIT.windowMs} THEN '1' ELSE CAST(CAST(value AS INTEGER) + 1 AS TEXT) END,
      updated_at = CASE WHEN updated_at <= ${now - DELETE_LIMIT.windowMs} THEN ${now} ELSE updated_at END RETURNING value`);
    if (!canDelete(Number(result?.value) - 1)) return Response.json({error: "少し待ってから、もう一度お試しください。"}, {status: 429});
    await db.run(sql`DELETE FROM watch_settings WHERE key LIKE 'delete:%' AND updated_at < ${now - DELETE_LIMIT.windowMs}`);
    const [star] = await db.select({orbitId: publicStars.orbitId}).from(publicStars).where(eq(publicStars.id, starId)).limit(1);
    if (!ownsStar(star, orbitId)) return Response.json({error: "この星は、もうありません。"}, {status: 404});
    // 消す瞬間にも持ち主を条件にし、通報と星を一緒に消す。
    await db.batch([
      db.delete(starReports).where(and(eq(starReports.starId, starId), sql`EXISTS (SELECT 1 FROM public_stars WHERE id = ${starId} AND orbit_id = ${orbitId})`)),
      db.delete(publicStars).where(and(eq(publicStars.id, starId), eq(publicStars.orbitId, orbitId))),
    ]);
    return Response.json({ok: true});
  } catch (error) {
    console.error("stars delete", errorKind(error));
    return Response.json({error: "消せませんでした。"}, {status: 503});
  }
}
