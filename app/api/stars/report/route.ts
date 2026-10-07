import { errorKind } from "../../error-kind.mjs";
import { env } from "cloudflare:workers";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { publicStars, starReports } from "../../../../db/schema";
import { parseReport, statusAfterReport, publicStarsEnabled } from "../rules.mjs";

// 他の人の星の通報（#23）。同じ端末から同じ星へは1回だけ数え、3件で非表示にする。
// 通報した端末の軌道ID は、2回目を数えないためだけに使う（名前・IPアドレスは保存しない）。
export async function POST(request: Request) {
  if (!publicStarsEnabled(env)) return Response.json({ enabled: false }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "通報する星を確認してください。" }, { status: 400 }); }
  const parsed = parseReport(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: parsed.status });
  const { starId, reporterOrbitId } = parsed.value;
  try {
    const db = getDb();
    const [star] = await db.select({ orbitId: publicStars.orbitId }).from(publicStars).where(eq(publicStars.id, starId)).limit(1);
    if (!star) return Response.json({ error: "この星は、もう空にありません。" }, { status: 404 });
    if (star.orbitId === reporterOrbitId) return Response.json({ error: "自分の星は通報できません。" }, { status: 400 });

    const inserted = await db
      .insert(starReports)
      .values({ starId, reporterOrbitId, createdAt: Date.now() })
      .onConflictDoNothing()
      .returning({ starId: starReports.starId });
    // 2回目の通報は数えないが、押した人には「受け付けた」と同じに見せる（同じ操作の結果を変えない）
    if (!inserted.length) return Response.json({ ok: true });

    const [counted] = await db
      .update(publicStars)
      .set({ reports: sql`${publicStars.reports} + 1` })
      .where(eq(publicStars.id, starId))
      .returning({ reports: publicStars.reports, status: publicStars.status });
    if (counted) {
      const next = statusAfterReport(counted);
      if (next !== counted.status) await db.update(publicStars).set({ status: next }).where(eq(publicStars.id, starId));
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error("stars report", errorKind(error));
    return Response.json({ error: "通報を送れませんでした。" }, { status: 503 });
  }
}
