import { rateLimit } from "../../rate-limit";
import {env} from "cloudflare:workers";
import {and, eq, sql} from "drizzle-orm";
import {getDb} from "../../../../db";
import {publicStars} from "../../../../db/schema";
import {errorKind} from "../../error-kind.mjs";
import {canDelete, DELETE_LIMIT, parseReturn, publicStarsEnabled, returnedStar, RETURN_TTL_MS} from "../rules.mjs";

export async function POST(request: Request) {
  const limited = await rateLimit(request, '/api/stars/return', env);
  if (limited) return limited;
  if (!publicStarsEnabled(env)) return Response.json({enabled: false}, {status: 404});
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({error: "星を確認してください。"}, {status: 400}); }
  const parsed = parseReturn(body);
  if (!parsed.ok) return Response.json({error: parsed.error}, {status: parsed.status});
  const {starId, orbitId} = parsed.value;
  try {
    const db = getDb();
    const now = Date.now();
    const key = `return:${orbitId}`;
    // 別のWorkerへの連打や、本人確認に失敗した操作も回数に含める。
    const result = await db.get<{value: string}>(sql`INSERT INTO watch_settings (key, value, updated_at) VALUES (${key}, '1', ${now})
      ON CONFLICT(key) DO UPDATE SET value = CASE WHEN updated_at <= ${now - DELETE_LIMIT.windowMs} THEN '1' ELSE CAST(CAST(value AS INTEGER) + 1 AS TEXT) END,
      updated_at = CASE WHEN updated_at <= ${now - DELETE_LIMIT.windowMs} THEN ${now} ELSE updated_at END RETURNING value`);
    if (!canDelete(Number(result?.value) - 1)) return Response.json({error: "少し待ってから、もう一度お試しください。"}, {status: 429});
    await db.run(sql`DELETE FROM watch_settings WHERE key LIKE 'return:%' AND updated_at < ${now - DELETE_LIMIT.windowMs}`);
    const [star] = await db.select().from(publicStars).where(eq(publicStars.id, starId)).limit(1);
    const update = returnedStar(star, orbitId, now);
    if (!update) return Response.json({error: "この星は、もうありません。"}, {status: 404});
    // 同時の再送でも最初の帰還時刻を保ち、保留や非表示の状態は変えない。
    await db.update(publicStars).set({returnedAt: sql`COALESCE(returned_at, ${update.returnedAt})`, expiresAt: sql`COALESCE(returned_at, ${update.returnedAt}) + ${RETURN_TTL_MS}`}).where(and(eq(publicStars.id, starId), eq(publicStars.orbitId, orbitId)));
    return Response.json({ok: true});
  } catch (error) {
    console.error("stars return", errorKind(error));
    return Response.json({error: "帰還を届けられませんでした。"}, {status: 503});
  }
}
