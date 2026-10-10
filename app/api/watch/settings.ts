import {eq} from "drizzle-orm";
import {getDb} from "../../../db";
import {watchSettings} from "../../../db/schema";
import {errorKind} from "../error-kind.mjs";
import {isPaused} from "./rules.mjs";

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
