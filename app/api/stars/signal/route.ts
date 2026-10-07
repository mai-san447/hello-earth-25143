import { errorKind } from "../../error-kind.mjs";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { publicStars } from "../../../../db/schema";
import { recordSignal } from "../../signals/record";
import { isShowable, parseStarSignal, publicStarsEnabled } from "../rules.mjs";

// 他の人の星へ、応援の信号を送る。星の持ち主の軌道ID は画面に渡さず、ここで星から引く
// （軌道ID が分かると、届いた信号の時刻まで読めてしまうため）。
export async function POST(request: Request) {
  if (!publicStarsEnabled(env)) return Response.json({ enabled: false }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "信号の送り先を確認してください。" }, { status: 400 }); }
  const parsed = parseStarSignal(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: parsed.status });
  try {
    const [star] = await getDb().select().from(publicStars).where(eq(publicStars.id, parsed.value.starId)).limit(1);
    if (!star || !isShowable(star, { now: Date.now() })) return Response.json({ error: "この星は、もう空にありません。" }, { status: 404 });
    const verdict = await recordSignal(star.orbitId);
    if (!verdict.ok) return Response.json({ error: verdict.error }, { status: verdict.status });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("stars signal", errorKind(error));
    return Response.json({ error: "信号を送れませんでした。" }, { status: 503 });
  }
}
