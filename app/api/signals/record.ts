import { and, count, eq, gte, lt } from "drizzle-orm";
import { getDb } from "../../../db";
import { signals } from "../../../db/schema";
import { BURST_WINDOW_MS, DAILY_WINDOW_MS, RETENTION_MS, acceptSignal } from "./rules.mjs";

type Verdict = { ok: true } | { ok: false; status: number; error: string };

// 1つの軌道に信号を1回記録する。応援リンク（/api/signals）と、みんなの星（/api/stars/signal）の両方から使う。
// 受け付けの上限はどちらから来ても同じにする（同じ星への連打をどちらの入口でも止めるため）。
export async function recordSignal(orbitId: string): Promise<Verdict> {
  const now = Date.now();
  const db = getDb();
  const countSince = async (since: number) => {
    const [row] = await db
      .select({ value: count() })
      .from(signals)
      .where(and(eq(signals.orbitId, orbitId), gte(signals.createdAt, since)));
    return row?.value ?? 0;
  };
  const verdict = acceptSignal({
    orbitId,
    recentCount: await countSince(now - BURST_WINDOW_MS),
    dailyCount: await countSince(now - DAILY_WINDOW_MS),
  });
  if (!verdict.ok) return verdict;
  await db.insert(signals).values({ id: crypto.randomUUID(), orbitId, createdAt: now });
  // #17 1年を過ぎた信号は、この星に次の信号が届いたときに消す
  await db.delete(signals).where(and(eq(signals.orbitId, orbitId), lt(signals.createdAt, now - RETENTION_MS)));
  return { ok: true };
}
