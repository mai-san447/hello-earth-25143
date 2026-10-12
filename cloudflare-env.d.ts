declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    STARS_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
    // 見守り画面の合言葉を試せる回数（同じ回線から1分5回。全体のまちがい回数はデータベースでも数える）
    WATCH_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
    // 願いの絵（Workers AI）。2026-10-07 に画面の入口を外した。ART_ENABLED="true" のときだけ動く（既定は止める）
    AI?: { run(model: string, input: Record<string, unknown>): Promise<unknown> };
    BUCKET?: R2Bucket;
    CHATGPT_SYNC_ENABLED?: string;
    PUBLIC_STARS_ENABLED?: string;
    WATCH_TOKEN?: string;
    // ハートの1日1回を数える値を作る鍵（HMAC）。無い環境ではハートを出さない
    HEART_SECRET?: string;
    ART_ENABLED?: string;
  }
}
