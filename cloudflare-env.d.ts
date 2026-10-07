declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    // 願いの絵（Workers AI）。2026-10-07 に画面の入口を外した。ART_ENABLED="true" のときだけ動く（既定は止める）
    AI?: { run(model: string, input: Record<string, unknown>): Promise<unknown> };
    BUCKET?: R2Bucket;
    CHATGPT_SYNC_ENABLED?: string;
    PUBLIC_STARS_ENABLED?: string;
    ART_ENABLED?: string;
  }
}
