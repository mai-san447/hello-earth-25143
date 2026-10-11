import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {nearestStar, randomStar, nextAutoStar, tapCandidates, tapIndex, TAP_RADIUS} from '../public/floating-wishes.js';

test('24px以内の最も近い星だけ選び、境界も触れられる', () => {
  const points = [{x: 24, y: 0}, {x: 8, y: 0}, {x: 12, y: 0}];
  assert.equal(nearestStar(points, 0, 0), points[1]);
  assert.equal(nearestStar(points.slice(0, 1), 0, 0), points[0]);
  assert.equal(nearestStar(points, -25, 0), null);
  assert.equal(nearestStar([], 0, 0), null);
});

test('不正な座標や乱数では星を選ばず、同距離なら最初の星を選ぶ', () => {
  const points = [{x: NaN, y: 0}, {x: 1, y: 0}, {x: -1, y: 0}];
  assert.equal(nearestStar(points, 0, 0), points[1]);
  for (const value of [NaN, Infinity]) assert.equal(nearestStar(points, value, 0), null);
  assert.equal(nearestStar(points, 0, 0, -1), null);
  for (const value of [-1, 1, NaN, Infinity]) assert.equal(randomStar(points, value), null);
  assert.equal(randomStar([], 0), null);
});

test('偶然の出会いは渡した乱数から1つ選ぶ', () => {
  const points = [{id: 1}, {id: 2}, {id: 3}];
  assert.equal(randomStar(points, 0), points[0]);
  assert.equal(randomStar(points, .5), points[1]);
  assert.equal(randomStar(points, .999), points[2]);
});

test('自分の星は空のタップだけで浮かび、ボタン・シート・カードの操作では反応しない', () => {
  const shown = [];
  let home = true;
  const app = {getBoundingClientRect: () => ({left: 10, top: 20})};
  const canvas = {};
  const star = {x: 24, y: 30, wish: {text: '海を見る'}};
  const sandbox = {
    app, canvas, homeIsVisible: () => home, wishStarPoints: () => [star],
    FloatingWishes: {nearestStar, tapCandidates, tapIndex}, lastTap: null, homeSince: null, performance: {now: () => 0},
    showFloatingWish: point => shown.push(point), otherStarPoints: [],
    PublicStars: {nearestStar: () => null}, openStarCard: () => {},
  };
  vm.createContext(sandbox);
  const start = source.indexOf("  app.addEventListener('click', event => {");
  const end = source.indexOf('\n  });', start);
  vm.runInContext(`function tap(event) {${source.slice(source.indexOf('\n', start), end)}\n}`, sandbox);
  const event = {clientX: 34, clientY: 50, target: canvas};
  sandbox.tap(event);
  assert.deepEqual(shown, [star]);
  sandbox.tap({...event, target: {tagName: 'BUTTON'}});
  home = false;
  sandbox.tap(event);
  assert.equal(shown.length, 1);
});

const source = readFileSync(new URL('../public/mission.js', import.meta.url), 'utf8');
function functionSource(name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.ok(start >= 0);
  return source.slice(start, source.indexOf('\n  }', start) + 4);
}
function capsule(reducedMotion = false) {
  const timers = [];
  const sandbox = {
    returningWish: {id: 'wish', text: '<b>海を見る</b>'}, landed: true,
    openingCard: false, reducedMotion, returnCard: {hidden: true},
    floatingText: {style: {}, hidden: true}, fallback: {},
    rememberSheetFocus: () => {}, $: () => sandbox.fallback,
    hideFloatingWish: () => {}, revealCard: () => { sandbox.reveals++; },
    reveals: 0, setTimeout: (fn, ms) => timers.push({fn, ms}),
  };
  vm.createContext(sandbox);
  vm.runInContext(functionSource('openCard'), sandbox);
  return {sandbox, timers};
}

test('カプセルの連打でも1.2秒後にカードを1度だけ開く', () => {
  const {sandbox, timers} = capsule();
  sandbox.openCard();
  sandbox.openCard();
  assert.equal(timers.length, 1);
  assert.equal(timers[0].ms, 1200);
  assert.equal(sandbox.reveals, 0);
  assert.equal(sandbox.floatingText.textContent, '<b>海を見る</b>');
  assert.equal(sandbox.fallback.disabled, true);
  timers[0].fn();
  assert.equal(sandbox.reveals, 1);
  assert.equal(sandbox.openingCard, false);
  assert.equal(sandbox.fallback.disabled, false);
});

test('動きを減らす設定では待たずにカードを開き、取り消された願いは開かない', () => {
  const reduced = capsule(true);
  reduced.sandbox.openCard();
  assert.equal(reduced.sandbox.reveals, 1);
  assert.equal(reduced.timers.length, 0);
  const cancelled = capsule();
  cancelled.sandbox.openCard();
  cancelled.sandbox.returningWish = null;
  cancelled.timers[0].fn();
  assert.equal(cancelled.sandbox.reveals, 0);
});

test('ホームを見ている間、最初は数秒後、その後は一定の間隔で1つずつ浮かぶ（案C）。動きを減らす設定では浮かべない', () => {
  for (const reducedMotion of [false, true]) {
    let home = false;
    const shown = [];
    const sandbox = {
      homeSince: null, lastAutoWishId: null, openingCard: false, reducedMotion, focusPending: false, otherStarPoints: [],
      homeIsVisible: () => home, hideFloatingWish: () => {},
      wishStarPoints: () => [{wish: {id: 'a', status: 'waiting'}}, {wish: {id: 'b', status: 'waiting'}}],
      WishState: {orbitingWishes: items => items}, FloatingWishes: {nextAutoStar, AUTO_FIRST_MS: 3500, AUTO_INTERVAL_MS: 8000},
      Math: {random: () => 0}, showFloatingWish: (...args) => shown.push(args),
    };
    vm.createContext(sandbox);
    vm.runInContext(functionSource('updateFloatingWish'), sandbox);
    sandbox.updateFloatingWish(0);
    home = true;
    sandbox.updateFloatingWish(1000);
    sandbox.updateFloatingWish(4499);
    assert.equal(shown.length, 0);
    sandbox.updateFloatingWish(4500);
    sandbox.updateFloatingWish(12000);
    sandbox.updateFloatingWish(12500);
    if (reducedMotion) { assert.equal(shown.length, 0); continue; }
    assert.equal(shown.length, 2);
    assert.equal(shown[0][1], true);
    assert.notEqual(shown[0][0].wish.id, shown[1][0].wish.id);
  }
});

test('帰還票は最初の描画だけ現像し、入力更新では再生しない', async () => {
  const timers = [];
  const classes = new Set();
  const preview = {classList: {add: name => classes.add(name), remove: name => classes.delete(name)}};
  const sandbox = {
    receiptPreviewTimer: null, receiptPreviewVersion: 0, receiptRevealPending: true,
    receiptSheet: {hidden: false}, receiptWish: () => ({id: 'wish'}),
    commitReceiptFirstStep: async () => ({id: 'wish'}), canvasBlob: async () => ({}), receiptImage: null,
    document: {fonts: {ready: Promise.resolve()}},
    receiptContentFor: wish => wish, drawReceipt: () => ({toDataURL: () => 'data:image/png;base64,test'}),
    $: () => preview, clearTimeout: () => {}, setTimeout: fn => timers.push(fn),
  };
  vm.createContext(sandbox);
  vm.runInContext(functionSource('renderReceiptPreview'), sandbox);
  sandbox.renderReceiptPreview();
  await timers.shift()();
  assert.equal(classes.has('receipt-developing'), true);
  sandbox.renderReceiptPreview();
  await timers.shift()();
  assert.equal(classes.has('receipt-developing'), false);
  sandbox.receiptRevealPending = false;
  sandbox.renderReceiptPreview();
  await timers.shift()();
  assert.equal(classes.has('receipt-developing'), false);
  preview.src = 'current';
  sandbox.renderReceiptPreview();
  sandbox.receiptSheet.hidden = true;
  await timers.shift()();
  assert.equal(preview.src, 'current');
});

test('自動で浮かべる星は、直前と同じ星を続けて選ばない（1つしかなければその星）', () => {
  const points = [{wish: {id: 'a'}}, {wish: {id: 'b'}}];
  for (const r of [0, .5, .99]) assert.equal(nextAutoStar(points, 'a', r).wish.id, 'b');
  assert.equal(nextAutoStar([points[0]], 'a', 0).wish.id, 'a');
  assert.equal(nextAutoStar([], 'a', 0), null);
});

test('タップは自分の星を優先し、範囲内を近い順に並べる', () => {
  const own = (id, x, y) => ({wish: {id}, x, y});
  const other = (id, x, y) => ({star: {id}, x, y});
  const points = [other('o1', 101, 100), own('w1', 110, 100), own('w2', 100, 118), own('far', 200, 200)];
  assert.deepEqual(tapCandidates(points, 100, 100).map(p => (p.wish ?? p.star).id), ['w1', 'w2']);
  assert.deepEqual(tapCandidates([other('o1', 101, 100)], 100, 100).map(p => p.star.id), ['o1']);
  assert.deepEqual(tapCandidates(points, 0, 0), []);
  assert.equal(TAP_RADIUS, 24);
});

test('同じ場所をすぐにもう一度タップすると、次の星へ。離れた場所や時間がたてば最初から', () => {
  assert.equal(tapIndex(null, 100, 100, 0, 3), 0);
  assert.equal(tapIndex({x: 100, y: 100, time: 0, index: 0}, 104, 98, 1000, 3), 1);
  assert.equal(tapIndex({x: 100, y: 100, time: 0, index: 2}, 100, 100, 1000, 3), 0);
  assert.equal(tapIndex({x: 100, y: 100, time: 0, index: 0}, 160, 100, 1000, 3), 0);
  assert.equal(tapIndex({x: 100, y: 100, time: 0, index: 0}, 100, 100, 7000, 3), 0);
  assert.equal(tapIndex(null, 100, 100, 0, 0), -1);
});
