// みんなの星（#22）の、画面側の決まりごと。画面や保存を持たない純粋な関数だけを置き、node --test で確かめる。
// サーバー側の受け付けルールは app/api/stars/rules.mjs。

const DAY_MS = 24 * 60 * 60 * 1000;
const STAR_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const KINDS = new Set(['wish', 'fulfilled']);

// サーバーの SKY_LIMIT と同じ。端末に控えた星が多すぎても、この数までしか描かない
export const SKY_LIMIT = 24;
export const MAX_LENGTH = Object.freeze({wish: 60, fulfilled: 40});
// ネットがないときに控えておく「流す予定」の数。ネットがない場所で何度押しても溜まりすぎないように
export const QUEUE_LIMIT = 30;
// 長く離れている間も願いを失わないよう、公開の期限と同じ期間控える。
export const QUEUE_MAX_AGE_MS = 400 * DAY_MS;

// 端末に控えた星、またはサーバーから届いた星のうち、形が正しく期限内のものだけを使う。
// 通報した星は、この端末では二度と出さない
export function sanitizeStars(value, now, reportedIds = []) {
  if (!Array.isArray(value)) return [];
  const reported = new Set(reportedIds);
  return value
    .filter(star => star && typeof star === 'object'
      && typeof star.id === 'string' && STAR_ID.test(star.id)
      && KINDS.has(star.kind)
      && typeof star.text === 'string' && star.text.length > 0 && [...star.text].length <= MAX_LENGTH[star.kind]
      && Number.isFinite(star.expiresAt) && star.expiresAt > now
      && !reported.has(star.id))
    .map(({id, kind, text, expiresAt, returned, focus}) => ({id, kind, text, expiresAt, returned: returned === true, focus: focus === true}))
    .slice(0, SKY_LIMIT);
}

// 星ごとに決まった置き場所（毎回同じ場所に出るよう、id から決める）
export function starSeed(id) {
  let value = 2166136261;
  for (const character of String(id)) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  const seed = value >>> 0;
  return {raDeg: (seed % 36000) / 100, decDeg: 40 + ((seed >>> 8) % 4501) / 100, phase: (seed % 997) / 997};
}

// 触れた場所にいちばん近い星。指で触れるので、少し離れていても拾う（maxDistance は CSS ピクセル）
export function nearestStar(points, x, y, maxDistance = 26) {
  let best = null;
  let bestDistance = maxDistance;
  for (const point of points) {
    const distance = Math.hypot(point.x - x, point.y - y);
    if (distance <= bestDistance) {
      best = point.star;
      bestDistance = distance;
    }
  }
  return best;
}

// 「みんなの星」ボタンで、次の星を順に見せる（キーボードや読み上げでも星を読めるように）
export function nextStar(stars, currentId) {
  if (!stars.length) return null;
  const index = stars.findIndex(star => star.id === currentId);
  return stars[(index + 1) % stars.length];
}

// 同じ言葉の別の願いを混ぜないため、願いのIDで控えを区別する。
export function enqueue(queue, item, now) {
  const kept = pruneQueue(queue, now).filter(entry => item.wishId ? entry.wishId !== item.wishId : !(entry.kind === item.kind && entry.text === item.text && !entry.wishId));
  return [...kept, {kind: item.kind, text: item.text, queuedAt: now, ...(item.wishId ? {wishId: item.wishId} : {}), ...(item.publishId ? {publishId: item.publishId} : {})}].slice(-QUEUE_LIMIT);
}

export function pruneQueue(queue, now) {
  if (!Array.isArray(queue)) return [];
  return queue.filter(entry => entry && KINDS.has(entry.kind) && typeof entry.text === 'string'
    && (entry.wishId === undefined || (typeof entry.wishId === 'string' && entry.wishId.length > 0))
    && Number.isFinite(entry.queuedAt) && (STAR_ID.test(entry.publicStarId) || now - entry.queuedAt < (entry.kind === 'fulfilled' ? DAY_MS : QUEUE_MAX_AGE_MS)));
}

// 公開したあとに出す一言。保留（held）でも責めない言い方にする
export function publishMessage({status, number, kind}) {
  const label = kind === 'fulfilled' ? '「叶ったよ」を流れ星にしました' : '星空に流しました';
  if (status === 'held') return 'この願いは確認してから星空に出ます';
  return number ? `${label}。あなたの番号 ${number}` : label;
}

// 削除は帰還より優先し、同じ星の操作を重ねても控えを増やさない。
export function enqueueAction(queue, item) {
  const kept = sanitizeActions(queue);
  if (item.action === 'return' && kept.some(entry => entry.starId === item.starId && entry.action === 'delete')) return kept;
  return [...kept.filter(entry => entry.starId !== item.starId), item];
}

export function sanitizeActions(queue) {
  return Array.isArray(queue) ? queue.filter(item => item && STAR_ID.test(item.starId) && ['return', 'delete'].includes(item.action)) : [];
}

export function receiptUrl(origin, publicStarId) {
  return `${origin}/${typeof publicStarId === 'string' && STAR_ID.test(publicStarId) ? `?star=${encodeURIComponent(publicStarId)}` : ''}`;
}
