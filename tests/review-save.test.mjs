import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as WishState from '../public/wish-state.js';
import {createKeyedQueue} from '../public/keyed-queue.js';

const source = readFileSync(new URL('../public/mission.js', import.meta.url), 'utf8');
function functionSource(name) {
  const start = source.search(new RegExp(`  (?:async )?function ${name}\\(`));
  const end = source.indexOf('\n  }', start) + 4;
  assert.ok(start >= 0 && end > start);
  return source.slice(start, end);
}
function scene({fail = false, text = '見学を予約する', status = 'doing'} = {}) {
  const calls = [];
  const timers = [];
  const elements = new Map();
  const $ = key => {
    if (!elements.has(key)) elements.set(key, {textContent: '', disabled: false, value: '', classList: {add() {}, remove() {}}});
    return elements.get(key);
  };
  $('#receipt-first-step').value = text;
  const sandbox = {WishState, $, wishes: [{id: 'w', status, text: '星を見たい', createdAt: 1, updatedAt: 2, returnFrom: Date.now() + 86400000}],
    growthQueue: createKeyedQueue(), growthDrafts: new Map(), returningWish: null, returnFlight: null,
    launchFlight: null, landed: false, reducedMotion: true, TRIAL_KEY: 'trial',
    receiptImage: null, receiptPreviewTimer: null, receiptPreviewVersion: 0, receiptRevealPending: false, receiptSheet: {hidden: false},
    performance: {now: () => 0}, pendingLocation: {lat: 35.68, lon: 139.76}, Date, Math, location: {origin: 'https://example.com'},
    console: {error() {}}, setTimeout: fn => timers.push(fn), clearTimeout() {}, refreshInterface: () => calls.push('refresh'), setMissionStep() {}, playRecoveryTone() {}, playReturnWhoosh() {},
    document: {fonts: {ready: Promise.resolve()}, createElement: () => ({click: () => calls.push('download')})},
    URL: {createObjectURL: () => 'blob:test', revokeObjectURL() {}},
    window: {open: () => calls.push('post')},
    drawReceipt: () => {calls.push('draw'); return {toDataURL: () => 'data:image/png,test'};}, canvasBlob: async () => ({}),
    receiptContentFor: wish => ({wish, fileName: 'receipt.png'}), saveImage: async () => {calls.push('save'); return 'saved';},
    store: async (_mode, action) => {
      if (fail) throw new Error('IndexedDB failed');
      return action({put: wish => {calls.push('put'); sandbox.persisted = wish;}});
    },
    // 前に帰ってきた願いの記録（LAST_RETURN_KEY）は、試しの記録と分けて数える
    LAST_RETURN_KEY: 'last', readStorage: () => null, hideFloatingWish() {},
    writeStorage: key => { if (key === 'trial') {calls.push('trial'); sandbox.used = true;} },
  };
  sandbox.currentWish = id => sandbox.wishes.find(w => w.id === id);
  sandbox.receiptWish = () => sandbox.currentWish('w');
  sandbox.trialUsed = () => Boolean(sandbox.used);
  sandbox.readyToReturn = () => WishState.candidatesWithTrial(sandbox.wishes, Date.now(), sandbox.trialUsed());
  vm.createContext(sandbox);
  vm.runInContext(['updateGrowth','commitReceiptFirstStep','renderReceiptPreview','saveReceipt','shareReceipt','returnOne','finishReturn'].map(functionSource).join('\n'), sandbox);
  return {sandbox, calls, $, prepare: async () => {sandbox.renderReceiptPreview(); await timers.pop()();}};
}

test('試しの飛行中に再読み込みしても、試しを使った記録は残らず再試行できる', () => {
  const {sandbox, calls} = scene({status: 'waiting'});
  sandbox.returnOne();
  assert.ok(sandbox.returnFlight);
  assert.deepEqual(calls, ['refresh']);
  assert.equal(sandbox.wishes[0].status, 'waiting');
  assert.equal(WishState.trialAvailable(sandbox.wishes, sandbox.trialUsed()), true);
});

test('試しの帰還は保存成功後にだけ使用済みとなる。保存失敗なら再試行できる', async () => {
  for (const fail of [false, true]) {
    const {sandbox, calls} = scene({status: 'waiting', fail});
    sandbox.returnOne();
    await sandbox.finishReturn(sandbox.returningWish);
    assert.deepEqual(calls, fail ? ['refresh', 'refresh'] : ['refresh', 'put', 'trial', 'refresh']);
    assert.equal(sandbox.wishes[0].status, fail ? 'waiting' : 'returned');
    assert.equal(WishState.trialAvailable(sandbox.wishes, sandbox.trialUsed()), fail);
    if (fail) { sandbox.returnOne(); assert.ok(sandbox.returnFlight); }
    else assert.ok(Number.isFinite(sandbox.persisted.returnedAt));
  }
});

for (const operation of ['saveReceipt', 'shareReceipt']) {
  for (const failure of ['length', 'database']) {
    test(`${operation}：${failure}で一歩を保存できなければ、下書きとエラーを残し画像を保存しない`, async () => {
      const text = failure === 'length' ? 'あ'.repeat(61) : '見学を予約する';
      const {sandbox, calls, $, prepare} = scene({text, fail: failure === 'database'});
      if (operation === 'saveReceipt') await prepare();
      else await sandbox[operation]();
      // シェアの非同期処理も、ボタンが戻るところまで待って確かめる。
      for (let i = 0; i < 20; i++) await Promise.resolve();
      assert.equal(sandbox.growthDrafts.get('w'), text);
      assert.equal(sandbox.wishes[0].firstStep, undefined);
      assert.match($('#receipt-status').textContent, failure === 'length' ? /12字/ : /保存できません/);
      assert.deepEqual(calls, operation === 'shareReceipt' ? ['post', 'refresh'] : ['refresh']);
      assert.equal(sandbox.receiptImage, null);
      assert.equal($(operation === 'shareReceipt' ? '#receipt-share' : '#receipt-save').disabled, false);
    });
  }
  // シェアは投稿画面を開くだけ（画像は付けない。2026-10-11）。一歩はアプリに残す
  test(`${operation}：一歩の保存成功後に下書きを消す（印刷は画像を保存し、シェアは画像を付けない）`, async () => {
    const {sandbox, calls, prepare} = scene();
    if (operation === 'saveReceipt') await prepare();
    await sandbox[operation]();
    for (let i = 0; i < 20; i++) await Promise.resolve();
    assert.equal(sandbox.growthDrafts.has('w'), false);
    assert.equal(sandbox.persisted.firstStep, '見学を予約する');
    assert.deepEqual(calls, operation === 'shareReceipt' ? ['post', 'put', 'refresh'] : ['put', 'refresh', 'draw', 'save']);
  });
}

test('変わらない一歩は成功として返し、願いが消えた場合は失敗として返す', async () => {
  const {sandbox} = scene();
  assert.equal((await sandbox.updateGrowth('w', current => current, '', () => {})).ok, true);
  assert.equal((await sandbox.updateGrowth('missing', current => current, '')).ok, false);
});

test('保存ボタンは準備済みの画像を直ちに共有し、押した後に描画や保存を待たない', async () => {
  const {sandbox, calls, prepare} = scene();
  await prepare();
  calls.length = 0;
  const pending = sandbox.saveReceipt();
  assert.deepEqual(calls, ['save']);
  await pending;
});

test('一歩を書き直すと古い画像を使わず、保存できた内容からプレビューとBlobを作り直す', async () => {
  const {sandbox, calls, $, prepare} = scene();
  await prepare();
  const first = sandbox.receiptImage;
  $('#receipt-first-step').value = '見学へ行く';
  sandbox.renderReceiptPreview();
  assert.equal(sandbox.receiptImage, null);
  assert.equal($('#receipt-save').disabled, true);
  await prepare();
  assert.equal(sandbox.persisted.firstStep, '見学へ行く');
  assert.notEqual(sandbox.receiptImage, first);
  assert.equal(calls.filter(call => call === 'save').length, 0);
});
