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
  const elements = new Map();
  const $ = key => {
    if (!elements.has(key)) elements.set(key, {textContent: '', disabled: false, value: '', classList: {add() {}}});
    return elements.get(key);
  };
  $('#receipt-first-step').value = text;
  const sandbox = {WishState, $, wishes: [{id: 'w', status, text: '星を見たい', createdAt: 1, updatedAt: 2, returnFrom: Date.now() + 86400000}],
    growthQueue: createKeyedQueue(), growthDrafts: new Map(), returningWish: null, returnFlight: null,
    launchFlight: null, landed: false, reducedMotion: true, sampleButton: {}, TRIAL_KEY: 'trial',
    performance: {now: () => 0}, Date, Math, location: {origin: 'https://example.com'},
    console: {error() {}}, setTimeout() {}, refreshInterface() {}, setMissionStep() {}, playRecoveryTone() {}, playReturnWhoosh() {},
    document: {fonts: {ready: Promise.resolve()}, createElement: () => ({click: () => calls.push('download')})},
    URL: {createObjectURL: () => 'blob:test', revokeObjectURL() {}},
    window: {open: () => calls.push('post')},
    drawReceipt: () => {calls.push('draw'); return {};}, canvasBlob: async () => ({}),
    receiptContentFor: wish => ({wish, fileName: 'receipt.png'}), saveImage: async () => {calls.push('save'); return 'saved';},
    store: async (_mode, action) => {
      if (fail) throw new Error('IndexedDB failed');
      return action({put: wish => {calls.push('put'); sandbox.persisted = wish;}});
    },
    writeStorage: () => {calls.push('trial'); sandbox.used = true;},
  };
  sandbox.currentWish = id => sandbox.wishes.find(w => w.id === id);
  sandbox.receiptWish = () => sandbox.currentWish('w');
  sandbox.trialUsed = () => Boolean(sandbox.used);
  sandbox.readyToReturn = () => WishState.candidatesWithTrial(sandbox.wishes, Date.now(), sandbox.trialUsed());
  vm.createContext(sandbox);
  vm.runInContext(['updateGrowth','commitReceiptFirstStep','saveReceipt','shareReceipt','returnOne','finishReturn'].map(functionSource).join('\n'), sandbox);
  return {sandbox, calls, $};
}

test('試しの飛行中に再読み込みしても、試しを使った記録は残らず再試行できる', () => {
  const {sandbox, calls} = scene({status: 'waiting'});
  sandbox.returnOne();
  assert.ok(sandbox.returnFlight);
  assert.deepEqual(calls, []);
  assert.equal(sandbox.wishes[0].status, 'waiting');
  assert.equal(WishState.trialAvailable(sandbox.wishes, sandbox.trialUsed()), true);
});

test('試しの帰還は保存成功後にだけ使用済みとなる。保存失敗なら再試行できる', async () => {
  for (const fail of [false, true]) {
    const {sandbox, calls} = scene({status: 'waiting', fail});
    sandbox.returnOne();
    await sandbox.finishReturn(sandbox.returningWish);
    assert.deepEqual(calls, fail ? [] : ['put', 'trial']);
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
      const {sandbox, calls, $} = scene({text, fail: failure === 'database'});
      await sandbox[operation]();
      // シェアの非同期処理も、ボタンが戻るところまで待って確かめる。
      for (let i = 0; i < 20; i++) await Promise.resolve();
      assert.equal(sandbox.growthDrafts.get('w'), text);
      assert.equal(sandbox.wishes[0].firstStep, undefined);
      assert.match($('#receipt-status').textContent, failure === 'length' ? /60字/ : /保存できません/);
      assert.deepEqual(calls, operation === 'shareReceipt' ? ['post'] : []);
      assert.equal($(operation === 'shareReceipt' ? '#receipt-share' : '#receipt-save').disabled, false);
    });
  }
  test(`${operation}：一歩の保存成功後に下書きを消し、画像を保存する`, async () => {
    const {sandbox, calls} = scene();
    await sandbox[operation]();
    for (let i = 0; i < 20; i++) await Promise.resolve();
    assert.equal(sandbox.growthDrafts.has('w'), false);
    assert.equal(sandbox.persisted.firstStep, '見学を予約する');
    assert.deepEqual(calls, operation === 'shareReceipt' ? ['post', 'put', 'draw', 'download'] : ['put', 'draw', 'save']);
  });
}

test('変わらない一歩は成功として返し、願いが消えた場合は失敗として返す', async () => {
  const {sandbox} = scene();
  assert.equal((await sandbox.updateGrowth('w', current => current, '', () => {})).ok, true);
  assert.equal((await sandbox.updateGrowth('missing', current => current, '')).ok, false);
});
