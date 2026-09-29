// みんなの星（#22）と安全（#23）の受け付けルール。route.ts から使い、node --test でも確かめる。
// 決めた数はすべてここに置く（docs/みんなの星_設計.md、docs/状態設計.md の #17）。

import {isOrbitId} from '../signals/rules.mjs';

export {isOrbitId};

const STAR_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const DAY_MS = 24 * 60 * 60 * 1000;

export const KINDS = Object.freeze(['wish', 'fulfilled']);
export const STATUS = Object.freeze({VISIBLE: 'visible', HELD: 'held', HIDDEN: 'hidden'});

// 1行で読める長さ。願いは預ける画面と同じ60字、「叶ったよ」はひとことなので40字
export const MAX_LENGTH = Object.freeze({wish: 60, fulfilled: 40});
// 1つの軌道（端末）が1日（直近24時間）に流せる数。連投で星空が1人の言葉で埋まらないように
export const DAILY_WINDOW_MS = DAY_MS;
export const DAILY_LIMIT = Object.freeze({wish: 3, fulfilled: 3});
// 公開の有効期限。願いは30日、「叶ったよ」は1日だけの流れ星
export const TTL_MS = Object.freeze({wish: 30 * DAY_MS, fulfilled: DAY_MS});
// 1回に見える他の人の星。多すぎると自分の星が埋もれる
export const SKY_LIMIT = 12;
// 通報がこの数たまった星は、人が確かめるまで隠す
export const REPORT_HIDE_THRESHOLD = 3;
// 枝番の親番（小惑星イトカワの番号）。本物の星の名前ではなく、この作品の中だけの番号
export const NUMBER_PREFIX = '25143';

// 登録した注意語。当てはまったら消すのではなく「保留」にして、人が確かめる。
// 悪口に加えて、つらい気持ちの言葉も入れている（晒すより、先に人が見るほうがよいため）。
// 「ばか（〜ばかり）」「しね（少しねむい）」「インスタ（インスタント）」のように、
// ふつうの言葉の一部で当たるものは入れない。増やすときはテストも足す。
export const CAUTION_WORDS = Object.freeze([
  '死ね', '氏ね', '殺す', 'ころす', '殺したい', '消えろ', 'きえろ',
  'きもい', 'キモい', 'うざい', 'ウザい', 'ブス', 'アホ', 'クズ',
  '自殺', '死にたい', 'しにたい', '消えたい',
  'セックス', '援交', 'パパ活',
  'line id', 'lineid', 'ライン id', 'dm', '住所', '電話番号',
]);

// 病院名らしい並び（「○○病院」「○○クリニック」など、前に2文字以上）。約束「病院名は書きません」を守るため
// ひらがなは含めない（「近くの病院」まで保留にしないため）。「大学病院」は保留になるが、人が見て表示に戻せる
const HOSPITAL_NAME = /[\p{Script=Han}\p{Script=Katakana}A-Za-z0-9ー]{2,}(病院|医院|クリニック|医療センター)/u;
const URL_LIKE = /(https?:\/\/|www\.|[a-z0-9-]+\.(com|net|org|jp|io|me|co|ly|app|dev|xyz|info|link|site)\b)/i;
const EMAIL_LIKE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
// 電話番号らしい並び：数字が10個以上。間のハイフン・空白・点・かっこ・長音は許す（090-1234-5678 など）
const PHONE_LIKE = /\d(?:[\s\-‐―−ー().]*\d){9,}/;

export function isStarId(value) {
  return typeof value === 'string' && STAR_ID.test(value);
}

// 改行や連続した空白は1つの空白にし、前後の空白を落とす。見た目の制御文字も除く
export function normalizeText(value) {
  return String(value)
    .replace(/[\u0000-\u001f\u007f​-‏‪-‮⁠-⁤﻿]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 表示してよいかをルールで確かめる。全角の数字や記号（０９０、＠）も半角にそろえてから見る
export function screenText(text) {
  const plain = String(text).normalize('NFKC');
  const lower = plain.toLowerCase();
  // メールアドレスは「example.com」の部分が URL にも当たるので先に見る
  if (EMAIL_LIKE.test(plain)) return {status: STATUS.HELD, reason: 'email'};
  if (URL_LIKE.test(plain)) return {status: STATUS.HELD, reason: 'url'};
  if (PHONE_LIKE.test(plain)) return {status: STATUS.HELD, reason: 'phone'};
  if (HOSPITAL_NAME.test(plain)) return {status: STATUS.HELD, reason: 'hospital'};
  const compact = lower.replace(/\s+/g, '');
  const word = CAUTION_WORDS.find(item => {
    const target = item.normalize('NFKC').toLowerCase();
    // 「dm」のような英字だけの短い語は、ほかの英単語の一部で誤って当たらないよう単語として探す
    if (/^[a-z ]+$/.test(target) && target.replace(/ /g, '').length <= 3) return new RegExp(`(^|[^a-z])${target}($|[^a-z])`).test(lower);
    return compact.includes(target.replace(/\s+/g, ''));
  });
  if (word) return {status: STATUS.HELD, reason: 'word'};
  return {status: STATUS.VISIBLE, reason: null};
}

function bodyField(body, key) {
  return body && typeof body === 'object' && !Array.isArray(body) ? body[key] : undefined;
}

// 公開する言葉の形を確かめる。null や数値の JSON でも 500 にならないよう、形を確かめてから読む
export function parsePublish(body) {
  const orbitId = bodyField(body, 'orbitId');
  const kind = bodyField(body, 'kind');
  const raw = bodyField(body, 'text');
  if (!isOrbitId(orbitId)) return {ok: false, status: 400, error: '軌道を確認してください。'};
  if (!KINDS.includes(kind)) return {ok: false, status: 400, error: '流す言葉の種類を確認してください。'};
  if (typeof raw !== 'string') return {ok: false, status: 400, error: '流す言葉を入力してください。'};
  const text = normalizeText(raw);
  if (!text) return {ok: false, status: 400, error: '流す言葉を入力してください。'};
  if ([...text].length > MAX_LENGTH[kind]) return {ok: false, status: 400, error: `${MAX_LENGTH[kind]}字までにしてください。`};
  return {ok: true, value: {orbitId, kind, text}};
}

// 1日の上限。dailyCount はこの軌道が直近24時間に流した、同じ種類の数
export function acceptPublish({kind, dailyCount}) {
  if (dailyCount >= DAILY_LIMIT[kind]) {
    return {
      ok: false,
      status: 429,
      error: kind === 'wish' ? '星空に流せる願いは、1日3つまでです。また明日流せます。' : '「叶ったよ」は、1日3つまでです。また明日流せます。',
    };
  }
  return {ok: true};
}

export function expiresAt(kind, now) {
  return now + TTL_MS[kind];
}

// 通報の形。通報した端末の軌道ID は、同じ星への2回目を数えないためだけに使う
export function parseReport(body) {
  const starId = bodyField(body, 'starId');
  const reporterOrbitId = bodyField(body, 'reporterOrbitId');
  if (!isStarId(starId)) return {ok: false, status: 400, error: '通報する星を確認してください。'};
  if (!isOrbitId(reporterOrbitId)) return {ok: false, status: 400, error: '軌道を確認してください。'};
  return {ok: true, value: {starId, reporterOrbitId}};
}

// 通報が1件増えたあとの状態。表示中の星だけが、しきい値で非表示になる
// （保留は人の確認待ちのまま、非表示は非表示のまま）
export function statusAfterReport({status, reports}) {
  if (status === STATUS.VISIBLE && reports >= REPORT_HIDE_THRESHOLD) return STATUS.HIDDEN;
  return status;
}

// 他の人の星空に出してよいか（表示中・期限内・自分の星ではない）。取得の SQL と同じ条件
export function isShowable(star, {now, ownOrbitId = null}) {
  return star.status === STATUS.VISIBLE && star.expiresAt > now && star.orbitId !== ownOrbitId;
}

// 応援の信号を送るための星の形
export function parseStarSignal(body) {
  const starId = bodyField(body, 'starId');
  if (!isStarId(starId)) return {ok: false, status: 400, error: '信号の送り先を確認してください。'};
  return {ok: true, value: {starId}};
}

export function formatNumber(number) {
  if (!Number.isInteger(number) || number < 1) return null;
  return `${NUMBER_PREFIX}-${String(number).padStart(4, '0')}`;
}

// 返す星の形。軌道ID・状態・通報数は返さない（誰の星か、どれだけ通報されたかを外に出さない）
export function publicStar(row) {
  return {id: row.id, kind: row.kind, text: row.text, expiresAt: row.expiresAt};
}
