import { rateLimit } from "../../rate-limit";
import {env} from "cloudflare:workers";
import {and, count, eq, gte, lt, sql} from "drizzle-orm";
import {getDb} from "../../../../db";
import {orbits, publicStars, starHearts} from "../../../../db/schema";
import {errorKind} from "../../error-kind.mjs";
import {canHeart, HEART_KEEP_MS, HEART_STAR_DAILY_LIMIT, heartsEnabled, heartSource, parseHeart} from "../rules.mjs";

// 日付・端末・星を、運営者だけが持つ鍵（HEART_SECRET）で混ぜる（HMAC-SHA256）。
// 鍵を知らなければ、データベースを読めても、だれがどの星に送ったかを計算し直せない
async function heartKey(secret: string, text: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return [...new Uint8Array(signature)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

// みんなの星空の星にハートを送る（2026-10-12）。数は送った人には返さない（持ち主にだけ届く）。
// 同じ端末から同じ星へは1日1回。2回目以降も ok を返し、数えたかどうかは伝えない（数を探られないように）
export async function POST(request: Request) {
  const limited = await rateLimit(request, '/api/stars/heart', env);
  if (limited) return limited;
  if (!heartsEnabled(env)) return Response.json({enabled: false}, {status: 404});
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({error: "ハートを送る星を確認してください。"}, {status: 400}); }
  const parsed = parseHeart(body);
  if (!parsed.ok) return Response.json({error: parsed.error}, {status: parsed.status});
  const {starId, orbitId} = parsed.value;
  try {
    const db = getDb();
    const now = Date.now();
    // 番号を発行した端末（願いを預けたことがある端末）だけが送れる。軌道ID を作り直すだけで何度も送れないように
    const [giver] = await db.select({id: orbits.id}).from(orbits).where(eq(orbits.id, orbitId)).limit(1);
    if (!giver) return Response.json({error: "願いを1つ預けると、ハートを送れます。"}, {status: 403});
    const [star] = await db.select().from(publicStars).where(eq(publicStars.id, starId)).limit(1);
    if (!canHeart(star, orbitId, now)) return Response.json({error: "この星には送れません。"}, {status: 404});
    // 1つの星に1日に数えるハートの上限（いたずらで数を積み上げられないように）
    const [today] = await db.select({value: count()}).from(starHearts).where(and(eq(starHearts.starId, starId), gte(starHearts.createdAt, now - 24 * 60 * 60 * 1000)));
    if ((today?.value ?? 0) < HEART_STAR_DAILY_LIMIT) {
      const key = await heartKey(env.HEART_SECRET as string, heartSource(orbitId, starId, now));
      const inserted = await db.run(sql`INSERT OR IGNORE INTO star_hearts (key, star_id, created_at) VALUES (${key}, ${starId}, ${now})`);
      if ((inserted.meta?.changes ?? 0) > 0) await db.run(sql`UPDATE public_stars SET hearts = hearts + 1 WHERE id = ${starId}`);
    }
    await db.delete(starHearts).where(lt(starHearts.createdAt, now - HEART_KEEP_MS));
    return Response.json({ok: true});
  } catch (error) {
    console.error("stars heart", errorKind(error));
    return Response.json({error: "ハートを送れませんでした。"}, {status: 503});
  }
}
