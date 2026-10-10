import {isStarId} from '../stars/rules.mjs';

export function watchEnabled(env) {
  return Boolean(env?.DB) && typeof env?.WATCH_TOKEN === 'string' && env.WATCH_TOKEN.length >= 32;
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
