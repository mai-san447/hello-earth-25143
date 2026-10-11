import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {markReturned} from '../public/wish-state.js';

const source = readFileSync(new URL('../public/mission.js', import.meta.url), 'utf8');
function functionSource(name) {
  const start = source.search(new RegExp(`  (?:async )?function ${name}\\(`));
  assert.ok(start >= 0);
  return source.slice(start, source.indexOf('\n  }', start) + 4);
}
function element() {
  return {hidden: true, disabled: false, isConnected: true, classList: {contains: () => true},
    contains: () => false, closest: () => null, getClientRects: () => [1], focus() {this.focused = true;}};
}

test('帰還した場所は小数1桁だけを保存し、元の位置や願いを変更しない', () => {
  const wish = {id: 'w', status: 'waiting'};
  const observer = {lat: 35.681236, lon: -139.767125};
  assert.deepEqual(markReturned(wish, 123, observer).observedAt, {lat: 35.7, lon: -139.8});
  assert.equal(wish.status, 'waiting');
  assert.equal(observer.lat, 35.681236);
  assert.equal(markReturned(wish, 123, {lat: NaN, lon: 0}).observedAt, undefined);
});

test('スペースは操作要素や開いた窓では帰還を始めず、星空でだけ帰還する', () => {
  const elements = new Map();
  const $ = id => {if (!elements.has(id)) elements.set(id, element()); return elements.get(id);};
  let listener, returns = 0;
  const sandbox = {$, document: {activeElement: element()}, window: {addEventListener: (_type, fn) => {listener = fn;}},
    receiptSheet: element(), policySheet: element(), returnCard: element(), depositSheet: element(), locationModal: element(),
    openStarsDialog: () => null, returnOne: () => returns++, trapFocus() {}, closeArchive() {},
  };
  vm.createContext(sandbox);
  const start = source.indexOf("  window.addEventListener('keydown', event => {");
  const end = source.indexOf('\n  });', start) + 6;
  vm.runInContext(source.slice(start, end), sandbox);
  const press = () => {let prevented = false;listener({code: 'Space', key: ' ', repeat: false, preventDefault: () => {prevented = true;}});return prevented;};
  for (const tag of ['input','textarea','button','a','select','summary','checkbox']) {
    sandbox.document.activeElement.closest = selector => {assert.match(selector, /button/); return {tag};};
    assert.equal(press(), false);
  }
  sandbox.document.activeElement.closest = () => null;
  for (const dialog of [sandbox.receiptSheet, sandbox.policySheet, sandbox.returnCard, sandbox.depositSheet, $('#intro-screen'), $('#archive-sheet')]) {
    dialog.hidden = false;
    press();
    dialog.hidden = true;
  }
  sandbox.locationModal.classList.contains = () => false;
  press();
  sandbox.locationModal.classList.contains = () => true;
  sandbox.openStarsDialog = () => element();
  press();
  sandbox.openStarsDialog = () => null;
  assert.equal(returns, 0);
  assert.equal(press(), true);
  assert.equal(returns, 1);
});

test('Tabは位置モーダルの両端と窓外から窓の中へ戻る', () => {
  const first = element(), last = element(), outside = element();
  const dialog = {querySelectorAll: () => [first, last], contains: e => [first,last].includes(e)};
  const sandbox = {document: {activeElement: first}};
  vm.createContext(sandbox);
  vm.runInContext(functionSource('trapFocus'), sandbox);
  let prevented = 0;
  sandbox.trapFocus({shiftKey: true, preventDefault: () => prevented++}, dialog);
  assert.equal(last.focused, true);
  sandbox.document.activeElement = last;
  sandbox.trapFocus({shiftKey: false, preventDefault: () => prevented++}, dialog);
  assert.equal(first.focused, true);
  sandbox.document.activeElement = outside;
  sandbox.trapFocus({shiftKey: false, preventDefault: () => prevented++}, dialog);
  assert.equal(prevented, 3);
});

test('シートを閉じたら元の要素へ戻り、inertのバーや他の窓の外へは戻らない', () => {
  const elements = new Map();
  const $ = id => {if (!elements.has(id)) elements.set(id, element());return elements.get(id);};
  const origin = element(), sheet = element(), archive = $('#archive-sheet'), close = element();
  const sandbox = {$, sheetFocus: new Map([[sheet, origin]]), document: {activeElement: element()},
    receiptSheet: element(), promiseSheet: element(), starCard: element(), fulfilledSheet: element(), policySheet: element(), returnCard: element(), depositSheet: element()};
  vm.createContext(sandbox);
  vm.runInContext(functionSource('restoreSheetFocus'), sandbox);
  sandbox.restoreSheetFocus(sheet);
  assert.equal(origin.focused, true);
  origin.focused = false;
  origin.closest = () => ({inert: true});
  archive.hidden = false;
  archive.querySelector = () => close;
  sandbox.sheetFocus.set(sheet, origin);
  sandbox.restoreSheetFocus(sheet);
  assert.equal(origin.focused, false);
  assert.equal(close.focused, true);
});

test('共有がNotAllowedErrorならダウンロードし、キャンセルなら保存を続けない', async () => {
  for (const name of ['NotAllowedError','AbortError']) {
    const calls = [];
    const sandbox = {File: class {}, navigator: {canShare: () => true, share: () => {calls.push('share');return Promise.reject({name});}},
      URL: {createObjectURL: () => 'blob:image', revokeObjectURL() {}},
      document: {createElement: () => ({click: () => calls.push('download')})}, setTimeout() {}};
    vm.createContext(sandbox);
    vm.runInContext(functionSource('saveImage'), sandbox);
    if (name === 'NotAllowedError') assert.equal(await sandbox.saveImage({}, 'receipt.png', '帰還票', '保存しました'), '保存しました');
    else await assert.rejects(sandbox.saveImage({}, 'receipt.png', '帰還票', '保存しました'), error => error.name === name);
    assert.deepEqual(calls, name === 'NotAllowedError' ? ['share','download'] : ['share']);
  }
});

test('通信の期限は8秒で、対応していない環境では指定しない', () => {
  const sandbox = {AbortSignal: {timeout: ms => ms}};
  vm.createContext(sandbox);
  vm.runInContext(functionSource('requestTimeout'), sandbox);
  assert.equal(sandbox.requestTimeout(), 8000);
  sandbox.AbortSignal = {};
  assert.equal(sandbox.requestTimeout(), undefined);
  delete sandbox.AbortSignal;
  assert.equal(sandbox.requestTimeout(), undefined);
});

test('約束を断った後でも、公開を選び直すと同意の窓を開ける', async () => {
  const agree = element();
  const sandbox = {PROMISE_KEY: 'promise', readStorage: () => '0', promiseAgreed: () => false,
    document: {activeElement: element()}, promiseSheet: element(), $: () => agree, promiseResolve: null};
  vm.createContext(sandbox);
  vm.runInContext(functionSource('askPromise'), sandbox);
  assert.equal(await sandbox.askPromise(), false);
  const pending = sandbox.askPromise({retry: true});
  assert.equal(sandbox.promiseSheet.hidden, false);
  assert.equal(agree.focused, true);
  sandbox.promiseResolve(true);
  assert.equal(await pending, true);
});

test('浮かぶ言葉は操作バーの上端より上に置く', () => {
  const sandbox = {floatingText: {style: {}, classList: {add() {}}}, width: 400, height: 800,
    app: {getBoundingClientRect: () => ({top: 0})}, missionDock: {getBoundingClientRect: () => ({top: 600})},
    hideFloatingWish() {}, setTimeout() {}, floatingTimer: null};
  vm.createContext(sandbox);
  vm.runInContext(functionSource('showFloatingWish'), sandbox);
  sandbox.showFloatingWish({x: 200, y: 790, wish: {text: '星を見る'}});
  assert.equal(sandbox.floatingText.style.top, '588px');
});

test('位置の選択をやり直しても、閉じる処理と入口後の入力は1回だけ進む', () => {
  const timers = new Map();
  let next = 0, opens = 0, closes = 0;
  const sandbox = {Math, pendingLocation: null, locationCloseTimer: null, locationStatus: {},
    locationModal: {classList: {add: () => closes++}}, refreshSky() {}, depositAfterIntro: true,
    openDepositAfterIntro: () => opens++, restoreSheetFocus() {},
    setTimeout: fn => {timers.set(++next, fn);return next;}, clearTimeout: id => timers.delete(id)};
  vm.createContext(sandbox);
  vm.runInContext(functionSource('applyLocation'), sandbox);
  sandbox.applyLocation(35.68, 139.76, '東京の星空にしました。');
  assert.equal(sandbox.locationStatus.textContent, '東京の星空にしました。');
  sandbox.applyLocation(36, 140);
  assert.equal(sandbox.locationStatus.textContent, '今いる場所の空にしました。');
  for (const fn of timers.values()) fn();
  assert.equal(opens, 1);
  assert.equal(closes, 1);
});

test('動きの測定が来ない端末には3秒で案内し、シート内では振っても帰還しない', async () => {
  const timers = new Map(), elements = new Map(), listeners = new Map();
  const $ = id => {if (!elements.has(id)) elements.set(id, {...element(), classList: {add() {}}});return elements.get(id);};
  let next = 0, home = true, returns = 0;
  const sandbox = {$, readyToReturn: () => [1], returningWish: null, returnFlight: null, motionActive: false,
    motionSeen: false, motionTimer: null, lastShakeAt: 0, audioContext: {state: 'running'}, DeviceMotionEvent: {},
    window: {addEventListener: (type, fn) => listeners.set(type, fn)}, homeIsVisible: () => home, returnOne: () => returns++,
    setTimeout: (fn, ms) => {assert.equal(ms, 3000);timers.set(++next, fn);return next;}, clearTimeout: id => timers.delete(id)};
  vm.createContext(sandbox);
  vm.runInContext(functionSource('enableMotion'), sandbox);
  await sandbox.enableMotion();
  assert.equal($('#mission-status').textContent, 'スマホを振ると、1つ帰ってきます');
  for (const fn of timers.values()) fn();
  assert.equal($('#mission-status').textContent, 'この端末では振れません。「ひとつ帰す」を押してください');
  home = false;
  listeners.get('devicemotion')({acceleration: {x: 20, y: 0, z: 0}});
  assert.equal(returns, 0);
});

test('cloud同期でも観測地を送らず、通信に期限を付ける', async () => {
  let sent;
  const sandbox = {requestTimeout: () => 8000, fetch: async (_path, options) => {sent = options;return {ok: true, json: async () => ({})};}};
  vm.createContext(sandbox);
  vm.runInContext(functionSource('cloudRequest'), sandbox);
  await sandbox.cloudRequest('POST', {id: 'wish', text: '星を見たい', observedAt: {lat: 35.7, lon: 139.8}});
  assert.deepEqual(JSON.parse(sent.body), {id: 'wish', text: '星を見たい'});
  assert.equal(sent.signal, 8000);
});
