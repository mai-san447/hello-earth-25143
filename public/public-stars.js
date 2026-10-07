// みんなの星（#22）の、画面側の決まりごと。画面や保存を持たない純粋な関数だけを置き、node --test で確かめる。
// サーバー側の受け付けルールは app/api/stars/rules.mjs。

const DAY_MS = 24 * 60 * 60 * 1000;
const STAR_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const KINDS = new Set(['wish', 'fulfilled']);

// サーバーの SKY_LIMIT と同じ。端末に控えた星が多すぎても、この数までしか描かない
export const SKY_LIMIT = 12;
export const MAX_LENGTH = Object.freeze({wish: 60, fulfilled: 40});
// ネットがないときに控えておく「流す予定」の数。病室で何度押しても溜まりすぎないように
export const QUEUE_LIMIT = 6;
// 控えた「流す予定」は、この日数を過ぎたら流さずに捨てる（何週間も前の言葉が急に流れないように）
export const QUEUE_MAX_AGE_MS = 3 * DAY_MS;

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
    .map(({id, kind, text, expiresAt}) => ({id, kind, text, expiresAt}))
    .slice(0, SKY_LIMIT);
}

// 星ごとに決まった置き場所（毎回同じ場所に出るよう、id から決める）
export function starSeed(id) {
  let value = 2166136261;
  for (const character of String(id)) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  const seed = value >>> 0;
  return {angle: (seed % 6283) / 1000, lane: 0.55 + (seed % 61) / 100, phase: (seed % 997) / 997};
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

// 他の人の星への応援の信号は、この端末から同じ星へ1日1回まで（/signal と同じ考え方）
export function canSignal(sentDays, starId, today) {
  return !sentDays || sentDays[starId] !== today;
}

export function markSignal(sentDays, starId, today) {
  // 今日の記録だけを残す（昨日までの分は、もう止める理由がない）
  const next = {};
  for (const [id, day] of Object.entries(sentDays || {})) if (day === today) next[id] = day;
  next[starId] = today;
  return next;
}

// ネットがないときに「流す予定」を控える。同じ言葉を二重に控えない
export function enqueue(queue, item, now) {
  const kept = pruneQueue(queue, now).filter(entry => !(entry.kind === item.kind && entry.text === item.text));
  return [...kept, {kind: item.kind, text: item.text, queuedAt: now}].slice(-QUEUE_LIMIT);
}

export function pruneQueue(queue, now) {
  if (!Array.isArray(queue)) return [];
  return queue.filter(entry => entry && KINDS.has(entry.kind) && typeof entry.text === 'string'
    && Number.isFinite(entry.queuedAt) && now - entry.queuedAt < QUEUE_MAX_AGE_MS);
}

// 公開したあとに出す一言。保留（held）でも責めない言い方にする
export function publishMessage({status, number, kind}) {
  const label = kind === 'fulfilled' ? '「叶ったよ」を流れ星にしました' : '星空に流しました';
  if (status === 'held') return '言葉を確かめてから、星空に出します。少し待ってください';
  return number ? `${label}。あなたの番号 ${number}` : label;
}
