declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    // 願いの絵（Workers AI）。本人が押したときだけ使う
    AI?: { run(model: string, input: Record<string, unknown>): Promise<unknown> };
    BUCKET?: R2Bucket;
    CHATGPT_SYNC_ENABLED?: string;
    PUBLIC_STARS_ENABLED?: string;
  }
}
