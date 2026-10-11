import {env} from "cloudflare:workers";
import {desc, eq, inArray} from "drizzle-orm";
import {getDb} from "../../../db";
import {publicStars, starReports, watchSettings} from "../../../db/schema";
import {errorKind} from "../error-kind.mjs";
import {rateLimit} from "../rate-limit";
import {authorized, parseWatch, watchEnabled} from "./rules.mjs";
import {readPaused} from "./settings";

function reply(body: unknown, status = 200) {
  return Response.json(body, {status, headers: {"Cache-Control": "no-store", "X-Robots-Tag": "noindex"}});
}
async function guard(request: Request) {
  if (!watchEnabled(env)) return reply({error: "見つかりません。"}, 404);
  // 合言葉を試せるのは、同じ回線から1分5回まで（当て推量を止める）
  const limited = await rateLimit(request, "/api/watch", {STARS_LIMITER: env.WATCH_LIMITER});
  if (limited) return limited;
  if (!await authorized(env.WATCH_TOKEN!, request.headers.get("Authorization"))) {
    const error = new Error();
    console.error("watch authentication", errorKind(error));
    return reply({error: "トークンを確認してください。"}, 401);
  }
  return null;
}

export async function GET(request: Request) {
  const denied = await guard(request);
  if (denied) return denied;
  try {
    const stars = await getDb().select({id: publicStars.id, kind: publicStars.kind, text: publicStars.text, status: publicStars.status, reports: publicStars.reports, createdAt: publicStars.createdAt, expiresAt: publicStars.expiresAt})
      .from(publicStars).where(inArray(publicStars.status, ["held", "hidden"])).orderBy(desc(publicStars.createdAt), desc(publicStars.id)).limit(100);
    return reply({stars, paused: await readPaused()});
  } catch (error) {
    console.error("watch GET", errorKind(error));
    return reply({error: "読み込めませんでした。"}, 503);
  }
}

export async function POST(request: Request) {
  const denied = await guard(request);
  if (denied) return denied;
  let body: unknown;
  try { body = await request.json(); } catch { return reply({error: "操作を確認してください。"}, 400); }
  const parsed = parseWatch(body);
  if (!parsed.ok) return reply({error: "操作を確認してください。"}, 400);
  const {action, id} = parsed.value;
  try {
    const db = getDb();
    if (action === "pause" || action === "resume") {
      const setting = {key: "paused", value: action === "pause" ? "1" : "0", updatedAt: Date.now()};
      await db.insert(watchSettings).values(setting).onConflictDoUpdate({target: watchSettings.key, set: setting});
      return reply({ok: true, paused: action === "pause"});
    }
    if (action === "delete") {
      // 通報だけ残らないように、同じトランザクションで消す。
      const results = await db.batch([
        db.delete(starReports).where(eq(starReports.starId, id!)),
        db.delete(publicStars).where(eq(publicStars.id, id!)).returning({id: publicStars.id}),
      ]);
      if (!results[1].length) return reply({error: "この星は、もうありません。"}, 404);
    } else {
      const rows = await db.update(publicStars).set(action === "show" ? {status: "visible", reports: 0} : {status: "hidden"}).where(eq(publicStars.id, id!)).returning({id: publicStars.id});
      if (!rows.length) return reply({error: "この星は、もうありません。"}, 404);
    }
    return reply({ok: true});
  } catch (error) {
    console.error("watch POST", errorKind(error));
    return reply({error: "変更できませんでした。"}, 503);
  }
}
