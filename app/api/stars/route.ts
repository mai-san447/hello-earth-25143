import { rateLimit } from "../rate-limit";
import { errorKind } from "../error-kind.mjs";
import { env } from "cloudflare:workers";
import { and, count, eq, gt, gte, inArray, lt, ne, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { orbits, publicStars, starReports } from "../../../db/schema";
import { DAILY_WINDOW_MS, SKY_LIMIT, STATUS, GLOBAL_DAILY_LIMIT, acceptGlobal, acceptPublish, publicStarsEnabled, expiresAt, formatNumber, isOrbitId, isStarId, parsePublish, focusedStars, publishStatus } from "./rules.mjs";
import { readPaused } from "../watch/settings";

// みんなの星（#22）。公開を選んだ言葉（60字まで）と軌道IDだけを受け取る。名前・IPアドレスは保存しない。
// D1 の `DB` が無い環境、または PUBLIC_STARS_ENABLED が "true" でない環境では、機能ごと隠す（rules.mjs）。
function enabled() {
  return publicStarsEnabled(env);
}

async function orbitNumber(orbitId: string) {
  const [row] = await getDb().select({ number: orbits.number }).from(orbits).where(eq(orbits.id, orbitId)).limit(1);
  return formatNumber(row?.number ?? null);
}

// 自分の星が埋もれないよう、他の人の表示中・期限内の星を24個まで返す。
// 自分の軌道ID を渡すと、枝番（発行済みなら）も返す。
export async function GET(request: Request) {
  if (!enabled()) return Response.json({ enabled: false });
  const params = new URL(request.url).searchParams;
  const orbitId = params.get("orbit");
  const starId = params.get("star");
  if (starId !== null && !isStarId(starId)) return Response.json({error: "星を確認してください。"}, {status: 400});
  if (orbitId !== null && !isOrbitId(orbitId)) return Response.json({ error: "軌道を確認してください。" }, { status: 400 });
  try {
    const now = Date.now();
    const conditions = [eq(publicStars.status, STATUS.VISIBLE), gt(publicStars.expiresAt, now)];
    if (orbitId) conditions.push(ne(publicStars.orbitId, orbitId));
    // 表示中の星が数千件までなら ORDER BY random() で足りる（増えたら取り方を見直す）
    const rows = await getDb()
      .select()
      .from(publicStars)
      .where(and(...conditions))
      .orderBy(sql`random()`)
      .limit(SKY_LIMIT);
    // QRで指定した星だけは、自分の星でも見えるようにする。保留や期限切れは出さない。
    const [focused] = starId ? await getDb().select().from(publicStars).where(and(eq(publicStars.id, starId), eq(publicStars.status, STATUS.VISIBLE), gt(publicStars.expiresAt, now))).limit(1) : [];
    return Response.json({
      enabled: true,
      stars: focusedStars(rows, focused),
      number: orbitId ? await orbitNumber(orbitId) : null,
    });
  } catch (error) {
    console.error("stars GET", errorKind(error));
    return Response.json({ error: "みんなの星を読み込めません。" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const limited = await rateLimit(request, '/api/stars', env);
  if (limited) return limited;
  if (!enabled()) return Response.json({ enabled: false }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "流す言葉を確認してください。" }, { status: 400 }); }
  const parsed = parsePublish(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: parsed.status });
  const { orbitId, kind, text, starId } = parsed.value;
  try {
    const now = Date.now();
    const db = getDb();
    // 応答が届く前に電波が切れても、同じ控えの再送で星を増やさない。
    if (starId) {
      const [existing] = await db.select().from(publicStars).where(eq(publicStars.id, starId)).limit(1);
      if (existing) {
        if (existing.orbitId !== orbitId || existing.kind !== kind || existing.text !== text) return Response.json({error: "この星は使えません。"}, {status: 404});
        return Response.json({ok: true, id: existing.id, status: existing.status, number: await orbitNumber(orbitId), expiresAt: existing.expiresAt});
      }
    }
    const [global] = await db.select({value: count()}).from(publicStars).where(and(eq(publicStars.kind, kind), gte(publicStars.createdAt, now - DAILY_WINDOW_MS)));
    const globalVerdict = acceptGlobal({kind, globalCount: global?.value ?? 0});
    if (!globalVerdict.ok) return Response.json({error: globalVerdict.error}, {status: globalVerdict.status});
    const [daily] = await db
      .select({ value: count() })
      .from(publicStars)
      .where(and(eq(publicStars.orbitId, orbitId), eq(publicStars.kind, kind), gte(publicStars.createdAt, now - DAILY_WINDOW_MS)));
    const verdict = acceptPublish({ kind, dailyCount: daily?.value ?? 0 });
    if (!verdict.ok) return Response.json({ error: verdict.error }, { status: verdict.status });

    // 枝番：はじめて公開した軌道にだけ、次の番号を発行する。1つの文で数えて入れるので、番号は重ならない
    await db.run(sql`INSERT OR IGNORE INTO orbits (id, number, created_at) SELECT ${orbitId}, COALESCE(MAX(number), 0) + 1, ${now} FROM orbits`);
    const number = await orbitNumber(orbitId);
    if (!number) throw new Error("orbit number was not assigned");

    let status = publishStatus(text, await readPaused());
    const id = starId ?? crypto.randomUUID();
    let expires = expiresAt(kind, now);
    // 数えた直後に別の投稿が入っても、1つのSQL内で上限を守る。
    await db.run(sql`INSERT OR IGNORE INTO public_stars (id, orbit_id, kind, text, status, reports, created_at, expires_at)
      SELECT ${id}, ${orbitId}, ${kind}, ${text}, ${status}, 0, ${now}, ${expires}
      WHERE (SELECT COUNT(*) FROM public_stars WHERE kind = ${kind} AND created_at >= ${now - DAILY_WINDOW_MS}) < ${GLOBAL_DAILY_LIMIT[kind]}`);
    const [saved] = await db.select().from(publicStars).where(eq(publicStars.id, id)).limit(1);
    if (!saved) return Response.json({error: "今日は星空がいっぱいです。また明日どうぞ。"}, {status: 429});
    if (saved.orbitId !== orbitId || saved.kind !== kind || saved.text !== text) return Response.json({error: "この星は使えません。"}, {status: 404});
    status = saved.status;
    expires = saved.expiresAt;

    // 期限を過ぎたこの軌道の星は、次に公開したときに消す（持ちすぎない）
    const expired = await db
      .select({ id: publicStars.id })
      .from(publicStars)
      .where(and(eq(publicStars.orbitId, orbitId), lt(publicStars.expiresAt, now)));
    if (expired.length) {
      const ids = expired.map(row => row.id);
      await db.delete(starReports).where(inArray(starReports.starId, ids));
      await db.delete(publicStars).where(inArray(publicStars.id, ids));
    }

    // 保留（held）になったことは本人に伝える。理由の種類は返さない（どう書けば通るかの手がかりにしないため）
    return Response.json({ ok: true, id, status, number, expiresAt: expires });
  } catch (error) {
    console.error("stars POST", errorKind(error));
    return Response.json({ error: "星空に流せませんでした。" }, { status: 503 });
  }
}
