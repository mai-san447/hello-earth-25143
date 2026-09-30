import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
  QUEUE_LIMIT, QUEUE_MAX_AGE_MS, SKY_LIMIT, canSignal, enqueue, markSignal, nearestStar, nextStar,
  publishMessage, pruneQueue, sanitizeStars, starSeed,
} from '../public/public-stars.js';
import {MAX_LENGTH as SERVER_MAX_LENGTH, SKY_LIMIT as SERVER_SKY_LIMIT} from '../app/api/stars/rules.mjs';

const id = n => `c0ffee00-1234-4abc-8def-${String(n).padStart(12, '0')}`;
const star = (n, extra = {}) => ({id: id(n), kind: 'wish', text: `願い${n}`, expiresAt: 5000, ...extra});

test('画面とサーバーで、数と文字数の決まりがそろっている', () => {
  assert.equal(SKY_LIMIT, SERVER_SKY_LIMIT);
  assert.deepEqual({...SERVER_MAX_LENGTH}, {wish: 60, fulfilled: 40});
});

test('控えた星は、形が正しく期限内で、通報していないものだけを使う', () => {
  const stars = sanitizeStars([
    star(1),
    star(2, {expiresAt: 1000}),
    star(3, {kind: 'reply'}),
    star(4, {text: ''}),
    star(5, {id: 'x'}),
    null,
    'text',
    star(6, {orbitId: 'だれか', status: 'visible'}),
    star(7),
    star(8, {kind: 'fulfilled', text: 'あ'.repeat(41)}),
  ], 1000, [id(7)]);
  assert.deepEqual(stars.map(item => item.id), [id(1), id(6)]);
  assert.deepEqual(Object.keys(stars[1]), ['id', 'kind', 'text', 'expiresAt'], '余計な項目は持たない');
  assert.deepEqual(sanitizeStars(null, 0), []);
  assert.deepEqual(sanitizeStars({}, 0), []);
  assert.equal(sanitizeStars(Array.from({length: 20}, (_, n) => star(n + 1)), 0).length, SKY_LIMIT);
});

test('星の置き場所は id から決まり、毎回同じ', () => {
  assert.deepEqual(starSeed(id(1)), starSeed(id(1)));
  const seed = starSeed(id(2));
  assert.ok(seed.angle >= 0 && seed.angle < 6.3);
  assert.ok(seed.lane >= 0.55 && seed.lane <= 1.15);
});

test('触れた場所のいちばん近い星を選ぶ。遠すぎれば選ばない', () => {
  const points = [{x: 10, y: 10, star: star(1)}, {x: 40, y: 10, star: star(2)}];
  assert.equal(nearestStar(points, 12, 12).id, id(1));
  assert.equal(nearestStar(points, 35, 12).id, id(2));
  assert.equal(nearestStar(points, 200, 200), null);
  assert.equal(nearestStar([], 0, 0), null);
});

test('「みんなの星」ボタンは、星を順にめぐる', () => {
  const stars = [star(1), star(2), star(3)];
  assert.equal(nextStar(stars, null).id, id(1));
  assert.equal(nextStar(stars, id(1)).id, id(2));
  assert.equal(nextStar(stars, id(3)).id, id(1));
  assert.equal(nextStar([], id(1)), null);
});

test('他の人の星への信号は、同じ星へ1日1回。昨日の記録は残さない', () => {
  assert.equal(canSignal({}, id(1), '2026-09-30'), true);
  const sent = markSignal({[id(2)]: '2026-09-29'}, id(1), '2026-09-30');
  assert.deepEqual(sent, {[id(1)]: '2026-09-30'});
  assert.equal(canSignal(sent, id(1), '2026-09-30'), false);
  assert.equal(canSignal(sent, id(1), '2026-10-01'), true);
  assert.equal(canSignal(null, id(1), '2026-10-01'), true);
});

test('ネットがないときの「流す予定」は、重ねず・溜めすぎず・古いものは捨てる', () => {
  let queue = enqueue([], {kind: 'wish', text: '海へ'}, 0);
  queue = enqueue(queue, {kind: 'wish', text: '海へ'}, 10);
  assert.equal(queue.length, 1);
  for (let n = 0; n < QUEUE_LIMIT + 3; n++) queue = enqueue(queue, {kind: 'wish', text: `願い${n}`}, 20 + n);
  assert.equal(queue.length, QUEUE_LIMIT);
  assert.equal(pruneQueue(queue, 20 + QUEUE_MAX_AGE_MS + 100).length, 0);
  assert.deepEqual(pruneQueue('x', 0), []);
  assert.deepEqual(pruneQueue([{kind: 'reply', text: 'a', queuedAt: 0}], 1), []);
});

test('公開のあとの一言。保留でも責めない', () => {
  assert.equal(publishMessage({status: 'visible', number: '25143-0001', kind: 'wish'}), '星空に流しました。あなたの番号 25143-0001');
  assert.equal(publishMessage({status: 'visible', number: '25143-0001', kind: 'fulfilled'}), '「叶ったよ」を流れ星にしました。あなたの番号 25143-0001');
  assert.match(publishMessage({status: 'held', number: '25143-0001', kind: 'wish'}), /確かめてから/);
});
