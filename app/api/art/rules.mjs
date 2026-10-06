// 願いの絵（AI）。本人が「AIで願いの絵をつくる」を押したときだけ、その願いの言葉を Cloudflare Workers AI に送る。
// 言葉は翻訳と絵づくりにだけ使い、サーバーには残さない。残すのは「どの軌道が・いつ使ったか」だけ（回数の上限のため）。
// 画面を持たない純粋な関数だけを置き、テストで確かめる（route.ts が使う）。
import {isOrbitId} from '../signals/rules.mjs';

export const ART_TEXT_MAX = 60;
// 1つの軌道（端末）は1日5回まで。全体は1日300回まで（費用の上限）
export const ART_LIMIT = Object.freeze({perOrbitDaily: 5, globalDaily: 300, windowMs: 24 * 60 * 60 * 1000});

export const TRANSLATE_MODEL = '@cf/meta/m2m100-1.2b';
export const IMAGE_MODEL = '@cf/black-forest-labs/flux-1-schnell';

/** @returns {{ok: true, value: {orbitId: string, text: string}} | {ok: false, status: number, error: string}} */
export function parseArt(body) {
  const orbitId = body?.orbitId;
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!isOrbitId(orbitId)) return {ok: false, status: 400, error: '軌道を確認してください。'};
  if (!text) return {ok: false, status: 400, error: '願いの言葉がありません。'};
  if ([...text].length > ART_TEXT_MAX) return {ok: false, status: 400, error: `願いは${ART_TEXT_MAX}字までです。`};
  return {ok: true, value: {orbitId, text}};
}

/** @returns {{ok: true} | {ok: false, status: number, error: string}} */
export function acceptArt({orbitCount, globalCount}) {
  if (!Number.isInteger(orbitCount) || !Number.isInteger(globalCount)) return {ok: false, status: 503, error: '絵をつくれませんでした。'};
  if (orbitCount >= ART_LIMIT.perOrbitDaily) return {ok: false, status: 429, error: `絵をつくれるのは1日${ART_LIMIT.perOrbitDaily}回までです。また明日どうぞ。`};
  if (globalCount >= ART_LIMIT.globalDaily) return {ok: false, status: 429, error: '今日は絵づくりが混み合っています。また明日どうぞ。'};
  return {ok: true};
}

// 画風は固定し、願いの中身だけを変える（メンター会の助言）。感熱紙で映えるよう、白黒・太い線・白い背景にする
export function buildPrompt(englishWish) {
  const subject = String(englishWish ?? '').replace(/\s+/g, ' ').trim().slice(0, 300);
  // 「receipt」「print」などの言葉を入れると、紙そのものを描いてしまうので入れない（2026-10-07 試して分かった）
  return [
    `An illustration of this wish coming true: ${subject}.`,
    'Show one person and the scene of the wish, seen from a little distance, with a few tiny stars in the sky.',
    'Black and white ink drawing, bold clean lines, high contrast, plain white background, hand-drawn picture book style, gentle and hopeful mood.',
    'No text, no letters, no numbers, no logos, no watermark, no realistic faces, no religious symbols.',
  ].join(' ');
}
