import { env } from "cloudflare:workers";
import { and, count, eq, gt, gte, inArray, lt, ne, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { orbits, publicStars, starReports } from "../../../db/schema";
import { DAILY_WINDOW_MS, SKY_LIMIT, STATUS, acceptPublish, expiresAt, formatNumber, isOrbitId, parsePublish, publicStar, screenText } from "./rules.mjs";

// みんなの星（#22）。公開を選んだ言葉（60字まで）と軌道IDだけを受け取る。名前・IPアドレスは保存しない。
// D1 の `DB` が用意されていない環境では、応援の信号と同じく機能ごと隠す。
function enabled() {
  return Boolean(env.DB);
}

async function orbitNumber(orbitId: string) {
  const [row] = await getDb().select({ number: orbits.number }).from(orbits).where(eq(orbits.id, orbitId)).limit(1);
  return formatNumber(row?.number ?? null);
}

// 他の人の星を、表示中・期限内の中からランダムに12個まで返す。自分の星は除く。
// 自分の軌道ID を渡すと、枝番（発行済みなら）も返す。
export async function GET(request: Request) {
  if (!enabled()) return Response.json({ enabled: false });
  const orbitId = new URL(request.url).searchParams.get("orbit");
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
    return Response.json({
      enabled: true,
      stars: rows.map(publicStar),
      number: orbitId ? await orbitNumber(orbitId) : null,
    });
  } catch (error) {
    console.error("stars GET", error);
    return Response.json({ error: "みんなの星を読み込めません。" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!enabled()) return Response.json({ enabled: false }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "流す言葉を確認してください。" }, { status: 400 }); }
  const parsed = parsePublish(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: parsed.status });
  const { orbitId, kind, text } = parsed.value;
  try {
    const now = Date.now();
    const db = getDb();
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

    const screened = screenText(text);
    const id = crypto.randomUUID();
    const expires = expiresAt(kind, now);
    await db.insert(publicStars).values({ id, orbitId, kind, text, status: screened.status, reports: 0, createdAt: now, expiresAt: expires });

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
    return Response.json({ ok: true, id, status: screened.status, number, expiresAt: expires });
  } catch (error) {
    console.error("stars POST", error);
    return Response.json({ error: "星空に流せませんでした。" }, { status: 503 });
  }
}
