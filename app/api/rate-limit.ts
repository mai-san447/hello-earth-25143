type LimiterEnv = { STARS_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> } };

export async function rateLimit(request: Request, route: string, bindings: LimiterEnv): Promise<Response | null> {
  if (!bindings.STARS_LIMITER) return null;
  try {
    const result = await bindings.STARS_LIMITER.limit({key: `${route}:${request.headers.get('CF-Connecting-IP') ?? 'unknown'}`});
    return result.success ? null : Response.json({error: "少し時間をおいてください。"}, {status: 429});
  } catch {
    // 制限サービスの障害で願いを預けられなくしないため、IPも例外も記録せず通す。
    return null;
  }
}
