import { rateLimit } from "../../rate-limit";
import {env} from "cloudflare:workers";
import {eq, lt} from "drizzle-orm";
import {getDb} from "../../../../db";
import {publicStars, starHearts} from "../../../../db/schema";
import {errorKind} from "../../error-kind.mjs";
import {HEART_KEEP_MS, isOrbitId, publicStarsEnabled} from "../rules.mjs";

// 自分の星に届いたハートの数（2026-10-12）。軌道ID は端末の中だけにある乱数なので、持ち主にしか分からない。
// 回収記録と帰還票を開いたときだけ呼ぶ（星空を見るたびに軌道ID を送らないため）
export async function POST(request: Request) {
  const limited = await rateLimit(request, '/api/stars/hearts', env);
  if (limited) return limited;
  if (!publicStarsEnabled(env)) return Response.json({enabled: false}, {status: 404});
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({error: "軌道を確認してください。"}, {status: 400}); }
  const orbitId = body && typeof body === "object" && !Array.isArray(body) ? (body as {orbitId?: unknown}).orbitId : undefined;
  if (!isOrbitId(orbitId)) return Response.json({error: "軌道を確認してください。"}, {status: 400});
  try {
    // 1日1回を数えるための値は3日で消す。ハートが送られない日が続いても残らないよう、ここでも消す
    await getDb().delete(starHearts).where(lt(starHearts.createdAt, Date.now() - HEART_KEEP_MS));
    const rows = await getDb().select({id: publicStars.id, hearts: publicStars.hearts}).from(publicStars).where(eq(publicStars.orbitId, orbitId as string));
    return Response.json({hearts: Object.fromEntries(rows.filter(row => row.hearts > 0).map(row => [row.id, row.hearts]))});
  } catch (error) {
    console.error("stars hearts", errorKind(error));
    return Response.json({error: "ハートの数を読めませんでした。"}, {status: 503});
  }
}
