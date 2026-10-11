import {and, eq, like, lt, sql} from "drizzle-orm";
import {getDb} from "../../../db";
import {watchSettings} from "../../../db/schema";
import {errorKind} from "../error-kind.mjs";
import {WATCH_FAIL_LIMIT, failBucket, isPaused} from "./rules.mjs";

export async function readPaused() {
  try {
    const [row] = await getDb().select({value: watchSettings.value}).from(watchSettings).where(eq(watchSettings.key, "paused")).limit(1);
    return isPaused(row?.value);
  } catch (error) {
    // 表の準備前や障害中に、確認していない言葉が出ないようにする。
    console.error("watch settings", errorKind(error));
    return true;
  }
}

export async function readFailures(now: number) {
  try {
    const [row] = await getDb().select({value: watchSettings.value}).from(watchSettings).where(eq(watchSettings.key, failBucket(now))).limit(1);
    return Number(row?.value ?? 0);
  } catch (error) {
    // 数えられないときは、安全なほうに倒して受け付けない。
    console.error("watch failures", errorKind(error));
    return WATCH_FAIL_LIMIT;
  }
}

export async function recordFailure(now: number) {
  const key = failBucket(now);
  try {
    await getDb().insert(watchSettings).values({key, value: "1", updatedAt: now})
      .onConflictDoUpdate({target: watchSettings.key, set: {value: sql`CAST(${watchSettings.value} AS INTEGER) + 1`, updatedAt: now}});
    // 過ぎた1分の数は要らないので消す（表に溜めない）
    await getDb().delete(watchSettings).where(and(like(watchSettings.key, "fail:%"), lt(watchSettings.updatedAt, now - 120000)));
  } catch (error) {
    console.error("watch failures", errorKind(error));
  }
}
