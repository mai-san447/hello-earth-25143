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
// そこで、間違えた回数をデータベースで1分ごとに数え、全体で5回を超えたらその1分は受け付けない。
export const WATCH_FAIL_LIMIT = 5;
export function failBucket(now) { return `fail:${Math.floor(now / 60000)}`; }
export function tooManyFailures(count) { return Number(count) >= WATCH_FAIL_LIMIT; }
