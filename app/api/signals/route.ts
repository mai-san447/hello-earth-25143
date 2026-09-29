import { env } from "cloudflare:workers";
import { and, count, desc, eq, gte, lt } from "drizzle-orm";
import { getDb } from "../../../db";
import { signals } from "../../../db/schema";
import { BURST_WINDOW_MS, DAILY_WINDOW_MS, MAX_TIMES, RETENTION_MS, acceptSignal, isOrbitId } from "./rules.mjs";

// 応援の信号。D1 の `DB` が用意されていない環境（今の本番）では機能ごと隠す。
// 名前・言葉・IPアドレスは受け取らず、保存もしない。
function enabled() {
  return Boolean(env.DB);
}

export async function GET(request: Request) {
  if (!enabled()) return Response.json({ enabled: false });
  const params = new URL(request.url).searchParams;
  // 応援する人のページは「受け付けているか」だけ知ればよい。持ち主に届いた時刻は返さない
  if (params.get("check") === "1") return Response.json({ enabled: true });
  const orbitId = params.get("orbit");
  if (!isOrbitId(orbitId)) return Response.json({ error: "軌道を確認してください。" }, { status: 400 });
  try {
    const rows = await getDb()
      .select({ createdAt: signals.createdAt })
      .from(signals)
      .where(and(eq(signals.orbitId, orbitId as string), gte(signals.createdAt, Date.now() - RETENTION_MS)))
      .orderBy(desc(signals.createdAt))
      .limit(MAX_TIMES);
    return Response.json({ enabled: true, times: rows.map(row => row.createdAt) });
  } catch (error) {
    console.error("signals GET", error);
    return Response.json({ error: "信号を読み込めません。" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!enabled()) return Response.json({ enabled: false }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "信号の送り先を確認してください。" }, { status: 400 }); }
  // null や数値の JSON でも 500 にならないよう、形を確かめてから読む
  const orbitId = body && typeof body === "object" ? (body as Record<string, unknown>).orbitId : undefined;
  if (!isOrbitId(orbitId)) return Response.json({ error: "信号の送り先を確認してください。" }, { status: 400 });
  try {
    const now = Date.now();
    const db = getDb();
    const countSince = async (since: number) => {
      const [row] = await db
        .select({ value: count() })
        .from(signals)
        .where(and(eq(signals.orbitId, orbitId as string), gte(signals.createdAt, since)));
      return row?.value ?? 0;
    };
    const verdict = acceptSignal({
      orbitId,
      recentCount: await countSince(now - BURST_WINDOW_MS),
      dailyCount: await countSince(now - DAILY_WINDOW_MS),
    });
    if (!verdict.ok) return Response.json({ error: verdict.error }, { status: verdict.status });
    await db.insert(signals).values({ id: crypto.randomUUID(), orbitId: orbitId as string, createdAt: now });
    // #17 1年を過ぎた信号は、この星に次の信号が届いたときに消す
    await db.delete(signals).where(and(eq(signals.orbitId, orbitId as string), lt(signals.createdAt, now - RETENTION_MS)));
    return Response.json({ ok: true });
  } catch (error) {
    console.error("signals POST", error);
    return Response.json({ error: "信号を送れませんでした。" }, { status: 503 });
  }
}
