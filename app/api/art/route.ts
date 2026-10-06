import { env } from "cloudflare:workers";
import { and, count, eq, gt } from "drizzle-orm";
import { getDb } from "../../../db";
import { artUses } from "../../../db/schema";
import { ART_LIMIT, IMAGE_MODEL, TRANSLATE_MODEL, acceptArt, buildPrompt, parseArt } from "./rules.mjs";

// 願いの絵（AI）。本人が押したときだけ呼ばれる。願いの言葉は翻訳と絵づくりにだけ使い、保存もログ出力もしない。
// 保存するのは「軌道ID と時刻」だけ（1日の回数の上限のため）。AI か D1 がない環境では機能ごと隠す。
export async function POST(request: Request) {
  if (!env.AI || !env.DB) return Response.json({ enabled: false });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "入力を確認してください。" }, { status: 400 }); }
  const parsed = parseArt(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: parsed.status });
  const { orbitId, text } = parsed.value;
  try {
    const db = getDb();
    const since = Date.now() - ART_LIMIT.windowMs;
    const [mine] = await db.select({ value: count() }).from(artUses).where(and(eq(artUses.orbitId, orbitId), gt(artUses.createdAt, since)));
    const [all] = await db.select({ value: count() }).from(artUses).where(gt(artUses.createdAt, since));
    const verdict = acceptArt({ orbitCount: mine?.value ?? 0, globalCount: all?.value ?? 0 });
    if (!verdict.ok) return Response.json({ error: verdict.error }, { status: verdict.status });

    // 日本語のままだと絵の精度が落ちるので、先に英語にする（失敗したら、そのままの言葉で描く）
    let english = text;
    try {
      const translated = (await env.AI.run(TRANSLATE_MODEL, { text, source_lang: "ja", target_lang: "en" })) as { translated_text?: string };
      if (translated?.translated_text) english = translated.translated_text;
    } catch (error) {
      console.error("art translate failed", (error as Error)?.name);
    }
    const result = (await env.AI.run(IMAGE_MODEL, { prompt: buildPrompt(english), steps: 4 })) as { image?: string };
    if (!result?.image) throw new Error("no image");
    await db.insert(artUses).values({ orbitId, createdAt: Date.now() });
    return Response.json({ enabled: true, image: result.image });
  } catch (error) {
    // 願いの言葉はログに出さない
    console.error("art POST failed", (error as Error)?.name, (error as Error)?.message?.slice(0, 120));
    return Response.json({ error: "絵をつくれませんでした。時間をおいて、もう一度お試しください。" }, { status: 503 });
  }
}
