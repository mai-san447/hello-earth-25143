// 応援の信号の受け付けルール（route.ts から使い、node --test でも確かめる）。

const ORBIT_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

// 1つの軌道に、この時間内に受け付ける信号の上限。いたずらで数が膨らまないようにする。
export const BURST_WINDOW_MS = 60 * 1000;
export const BURST_LIMIT = 30;
// #17 1つの星（軌道）に1日（直近24時間）で受け付ける信号の上限。家族・友人の規模なら十分
export const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
export const DAILY_LIMIT = 100;
// #17 信号は1年で削除する（帰還が始まる日の上限と合わせる。持ちすぎない）
export const RETENTION_MS = 365 * 24 * 60 * 60 * 1000;
// 持ち主の端末に返す時刻の上限（新しい順）
export const MAX_TIMES = 2000;

export function isOrbitId(value) {
  return typeof value === 'string' && ORBIT_ID.test(value);
}

export function acceptSignal({orbitId, recentCount, dailyCount = 0}) {
  if (!isOrbitId(orbitId)) return {ok: false, status: 400, error: '信号の送り先を確認してください。'};
  if (recentCount >= BURST_LIMIT) return {ok: false, status: 429, error: '信号が混み合っています。少し待ってから送ってください。'};
  if (dailyCount >= DAILY_LIMIT) return {ok: false, status: 429, error: '今日はこの星に、たくさんの信号が届きました。また明日送ってください。'};
  return {ok: true};
}
