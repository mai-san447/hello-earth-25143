// 願いの絵（AI）。本人が「AIで願いの絵をつくる」を押したときだけ、その願いの言葉を Cloudflare Workers AI に送る。
// 言葉は翻訳と絵づくりにだけ使い、サーバーには残さない。残すのは「どの軌道が・いつ使ったか」だけ（回数の上限のため）。
// 画面を持たない純粋な関数だけを置き、テストで確かめる（route.ts が使う）。
import {isOrbitId} from '../signals/rules.mjs';

export const ART_TEXT_MAX = 60;
// 1つの軌道（端末）は1日5回まで。全体は1日300回まで（費用の上限）
export const ART_LIMIT = Object.freeze({perOrbitDaily: 5, globalDaily: 300, windowMs: 24 * 60 * 60 * 1000});

// 願い（日本語）を「絵に描ける場面の英語」にする。直訳（m2m100）だと「パンを焼いてみる」が「burn」になるなど弱かったため、言葉を理解できるモデルにした
export const SCENE_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8';
export const SCENE_SYSTEM = 'You turn a Japanese wish into a short English description of a picture. Describe only what can be seen: one small person doing the wish, the place, and objects. Use 8 to 20 words. Start with a verb in -ing form or a place. Do not use the words I, we, wish, want, dream, text, words, letters. Output only the description, no quotes.';
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
// 「I want to go into space」のような一人称の文は、そのまま文字として描かれやすいので、場面の言葉だけにする
export function sceneOf(englishWish) {
  return String(englishWish ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(i|we)\s+(really\s+)?(want|would like|'d like|wish|hope|plan|am going|will|would love|love)\s+(to\s+)?/i, '')
    .replace(/^(i|we)'d\s+(like|love)\s+to\s+/i, '')
    .replace(/^(someday|one day|someday,|one day,)\s*/i, '')
    .replace(/[.。!！?？]+$/, '')
    .slice(0, 300);
}

export function buildPrompt(englishWish) {
  // 説明の言葉（wish, receipt, text など）を入れると、AI がそれを文字として絵に描いてしまう。
  // 場面だけを書き、画風は肯定の言葉だけで指定する（2026-10-07 試して分かった）
  return `A small person, ${sceneOf(englishWish)}. Simple black and white ink illustration, hand-drawn picture book style, thick bold lines, high contrast, plain white background, a few tiny stars in the sky, gentle and hopeful mood, wordless.`;
}
