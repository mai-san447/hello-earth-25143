import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
  QUEUE_LIMIT, QUEUE_MAX_AGE_MS, SKY_LIMIT, enqueue, nearestStar, nextStar,
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
  assert.deepEqual(Object.keys(stars[1]), ['id', 'kind', 'text', 'expiresAt', 'returned', 'focus', 'stage'], '余計な項目は持たない');
  assert.equal(stars[1].stage, 'wish', '段階が届かない古い控えは、種類から決める');
  assert.deepEqual(sanitizeStars(null, 0), []);
  assert.deepEqual(sanitizeStars({}, 0), []);
  assert.equal(sanitizeStars(Array.from({length: 30}, (_, n) => star(n + 1)), 0).length, SKY_LIMIT);
});

test('星の置き場所は id から決まり、毎回同じ', () => {
  assert.deepEqual(starSeed(id(1)), starSeed(id(1)));
  const seed = starSeed(id(2));
  assert.ok(seed.raDeg >= 0 && seed.raDeg < 360);
  assert.ok(seed.decDeg >= 40 && seed.decDeg <= 85);
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

// 応援の信号は廃止したため、送信のテストも外す。

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
  assert.equal(publishMessage({status: 'visible', number: '25143-0001', kind: 'wish'}), 'みんなの星空に灯しました。あなたの番号 25143-0001');
  assert.equal(publishMessage({status: 'visible', number: '25143-0001', kind: 'fulfilled'}), '「叶ったよ」を流れ星にしました。あなたの番号 25143-0001');
  assert.match(publishMessage({status: 'held', number: '25143-0001', kind: 'wish'}), /確認してから/);
});

test('みんなの星空の置き場所は、天球全体に偏りなく散らばる（極に集まらない）', async () => {
  const {sphereSeed} = await import('../public/public-stars.js');
  const ids = Array.from({length: 4000}, (_, n) => `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`);
  const seeds = ids.map(sphereSeed);
  assert.deepEqual(sphereSeed(ids[0]), sphereSeed(ids[0]));
  for (const seed of seeds) assert.ok(seed.raDeg >= 0 && seed.raDeg < 360 && seed.decDeg >= -90 && seed.decDeg <= 90);
  // 面積に比例するなら、北半球と南半球はほぼ半分ずつ、赤緯60度より北は (1 - sin60°)/2 ≒ 6.7%
  const north = seeds.filter(seed => seed.decDeg > 0).length / seeds.length;
  const cap = seeds.filter(seed => seed.decDeg > 60).length / seeds.length;
  assert.ok(Math.abs(north - 0.5) < 0.04, `北半球 ${north}`);
  assert.ok(Math.abs(cap - (1 - Math.sin(Math.PI / 3)) / 2) < 0.025, `極のまわり ${cap}`);
});

test('段階を保ち、みんなの星空では多めに読める。「やってみる」の送信も控えられる', async () => {
  const {sanitizeStars, EVERYONE_LIMIT, enqueueAction, sanitizeActions} = await import('../public/public-stars.js');
  const many = Array.from({length: 400}, (_, n) => star(n + 1, {stage: n % 2 ? 'doing' : 'unknown'}));
  const kept = sanitizeStars(many, 0, [], EVERYONE_LIMIT);
  assert.equal(kept.length, EVERYONE_LIMIT);
  assert.deepEqual([kept[0].stage, kept[1].stage], ['wish', 'doing']);
  const sid = id(9);
  assert.deepEqual(enqueueAction([{action: 'return', starId: sid}], {action: 'doing', starId: sid}), [{action: 'doing', starId: sid}]);
  assert.deepEqual(enqueueAction([{action: 'delete', starId: sid}], {action: 'doing', starId: sid}), [{action: 'delete', starId: sid}], '消す星には送らない');
  assert.deepEqual(sanitizeActions([{action: 'doing', starId: sid}, {action: 'heart', starId: sid}]), [{action: 'doing', starId: sid}]);
});
