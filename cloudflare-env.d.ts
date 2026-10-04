declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    CHATGPT_SYNC_ENABLED?: string;
    PUBLIC_STARS_ENABLED?: string;
  }
}
