import {isStarId} from '../stars/rules.mjs';

// 合言葉は16文字以上。試す回数を1分5回までに止めるので、覚えやすい長さでも機械で当てられない（2026-10-12、本人と決定）
export const WATCH_TOKEN_MIN = 16;
export function watchEnabled(env) {
  return Boolean(env?.DB) && typeof env?.WATCH_TOKEN === 'string' && env.WATCH_TOKEN.length >= WATCH_TOKEN_MIN;
}

// 長さが違っても両方を固定長のハッシュにし、最後まで比較する。
export async function compareToken(expected, supplied) {
  const encoder = new TextEncoder();
  const hashes = await Promise.all([expected, supplied].map(token => crypto.subtle.digest('SHA-256', encoder.encode(token))));
  const left = new Uint8Array(hashes[0]);
  const right = new Uint8Array(hashes[1]);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}

export async function authorized(token, header) {
  const match = typeof header === 'string' ? /^Bearer (\S+)$/.exec(header) : null;
  const equal = await compareToken(token, match?.[1] ?? '');
  return Boolean(match) && equal;
}

/** @returns {{ok: true, value: {action: string, id?: string}} | {ok: false}} */
export function parseWatch(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {ok: false};
  const {action, id} = body;
  if (['pause', 'resume'].includes(action) && Object.keys(body).length === 1) return {ok: true, value: {action}};
  if (['show', 'hide', 'delete'].includes(action) && isStarId(id) && Object.keys(body).length === 2) return {ok: true, value: {action, id}};
  return {ok: false};
}

// 未設定や壊れた値も、人が再開するまでは表示しない。
export function isPaused(value) { return value !== '0'; }

// Cloudflare の回数制限は場所ごとに数えるため、本番で止まらないことがあった（2026-10-12に確認）。
// まちがいは2段で数える（2026-10-12 レビュー：全体で5回だけだと、だれかが5回まちがえ続けるだけで運営者も入れなくなった）。
// ・同じ回線から1分5回まで（Worker のメモリの中だけで数え、IP アドレスは保存しない）
// ・全体で1分30回まで（データベース。回線を替えて当て推量を続けられないための歯止め）
// 本当の守りは /watch を Cloudflare Access で囲むこと（docs/見守りの手順.md）
export const WATCH_FAIL_LIMIT = 30;
export const WATCH_FAIL_PER_SOURCE = 5;
// 同じ回線のまちがいを、1分ごとの数え先で数える（メモリの中だけ）。古い数え先は捨てる
export function sourceBlocked(failures, source, now) {
  const entry = failures.get(source);
  return Boolean(entry) && entry.bucket === failBucket(now) && entry.count >= WATCH_FAIL_PER_SOURCE;
}
export function recordSourceFailure(failures, source, now) {
  const bucket = failBucket(now);
  const entry = failures.get(source);
  failures.set(source, entry && entry.bucket === bucket ? {bucket, count: entry.count + 1} : {bucket, count: 1});
  // 覚えすぎない：1000件を超えたら、今の1分以外を捨てる
  if (failures.size > 1000) for (const [key, value] of failures) if (value.bucket !== bucket) failures.delete(key);
}
export function failBucket(now) { return `fail:${Math.floor(now / 60000)}`; }
export function tooManyFailures(count) { return Number(count) >= WATCH_FAIL_LIMIT; }
