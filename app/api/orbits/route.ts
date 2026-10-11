import { errorKind } from "../error-kind.mjs";
import { env } from "cloudflare:workers";
import { count, eq, gt, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { orbits } from "../../../db/schema";
import { isOrbitId } from "../signals/rules.mjs";
import { ORBIT_ISSUE_LIMIT, canIssueOrbit, formatNumber } from "../stars/rules.mjs";

// 人の番号（25143-0007 の「0007」）。最初に願いを預けた端末に、1 から順に発行する。
// 受け取るのは端末で作ったランダムな軌道ID だけ。名前・願いの中身・IPアドレスは受け取らず、保存もしない。
// 願いの番号（25143-0007-03 の「03」）は端末の中で数えるので、ここには来ない。
export async function POST(request: Request) {
  if (!env.DB) return Response.json({ enabled: false });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "軌道を確認してください。" }, { status: 400 }); }
  const orbitId = (body as { orbitId?: unknown } | null)?.orbitId;
  if (!isOrbitId(orbitId)) return Response.json({ error: "軌道を確認してください。" }, { status: 400 });
  try {
    const db = getDb();
    const existing = await db.select({ number: orbits.number }).from(orbits).where(eq(orbits.id, orbitId as string)).limit(1);
    if (!existing.length) {
      // 新しく発行するときだけ、速さの上限を見る。超えたら、少し待ってから受け取り直してもらう（預けることは止めない）
      const now = Date.now();
      const [recent] = await db.select({ value: count() }).from(orbits).where(gt(orbits.createdAt, now - ORBIT_ISSUE_LIMIT.windowMs));
      if (!canIssueOrbit(recent?.value ?? 0)) return Response.json({ error: "混み合っています。少し待ってから受け取ります。" }, { status: 429 });
    }
    // すでに番号がある軌道はそのまま（何度呼ばれても同じ番号を返す）
    await db.run(sql`INSERT OR IGNORE INTO orbits (id, number, created_at) SELECT ${orbitId}, COALESCE(MAX(number), 0) + 1, ${Date.now()} FROM orbits`);
    const [row] = await db.select({ number: orbits.number }).from(orbits).where(eq(orbits.id, orbitId as string)).limit(1);
    const number = formatNumber(row?.number ?? null);
    if (!number) throw new Error("orbit number was not assigned");
    return Response.json({ enabled: true, number });
  } catch (error) {
    // 表がまだない環境もここに来る。番号は後で取り直せるので、預けることは止めない（画面側）
    console.error("orbits POST", errorKind(error));
    return Response.json({ error: "番号を発行できませんでした。" }, { status: 503 });
  }
}
