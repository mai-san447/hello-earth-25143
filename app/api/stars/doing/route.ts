import { rateLimit } from "../../rate-limit";
import {env} from "cloudflare:workers";
import {and, eq, sql} from "drizzle-orm";
import {getDb} from "../../../../db";
import {publicStars} from "../../../../db/schema";
import {errorKind} from "../../error-kind.mjs";
import {canDelete, DELETE_LIMIT, doingStar, parseReturn, publicStarsEnabled} from "../rules.mjs";

// 受け取った願いを「やってみることにした」明るい星にする（みんなの空、2026-10-12）。本人の星だけを変える。
// 帰還で薄くしていた星も、明るさと期限を戻す。保留や非表示の状態は変えない
export async function POST(request: Request) {
  const limited = await rateLimit(request, '/api/stars/doing', env);
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
    const key = `doing:${orbitId}`;
    // 帰還・削除と同じく、本人確認に失敗した操作も回数に数える
    const result = await db.get<{value: string}>(sql`INSERT INTO watch_settings (key, value, updated_at) VALUES (${key}, '1', ${now})
      ON CONFLICT(key) DO UPDATE SET value = CASE WHEN updated_at <= ${now - DELETE_LIMIT.windowMs} THEN '1' ELSE CAST(CAST(value AS INTEGER) + 1 AS TEXT) END,
      updated_at = CASE WHEN updated_at <= ${now - DELETE_LIMIT.windowMs} THEN ${now} ELSE updated_at END RETURNING value`);
    if (!canDelete(Number(result?.value) - 1)) return Response.json({error: "少し待ってから、もう一度お試しください。"}, {status: 429});
    await db.run(sql`DELETE FROM watch_settings WHERE key LIKE 'doing:%' AND updated_at < ${now - DELETE_LIMIT.windowMs}`);
    const [star] = await db.select().from(publicStars).where(eq(publicStars.id, starId)).limit(1);
    const update = doingStar(star, orbitId, now);
    if (!update) return Response.json({error: "この星は、もうありません。"}, {status: 404});
    await db.update(publicStars).set({doingAt: sql`COALESCE(doing_at, ${update.doingAt})`, returnedAt: null, expiresAt: update.expiresAt})
      .where(and(eq(publicStars.id, starId), eq(publicStars.orbitId, orbitId)));
    return Response.json({ok: true});
  } catch (error) {
    console.error("stars doing", errorKind(error));
    return Response.json({error: "みんなの空に届けられませんでした。"}, {status: 503});
  }
}
