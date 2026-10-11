import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {acceptGlobal, GLOBAL_DAILY_LIMIT} from '../app/api/stars/rules.mjs';
import * as WishState from '../public/wish-state.js';

function compile(file, require = () => {throw Error('予期しない依存');}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, {exports, require, Response});
  return exports;
}
const {rateLimit} = compile('../app/api/rate-limit.ts');

test('全体上限は種類別に直前まで受け付け、上限以上で429', () => {
  assert.ok(Object.isFrozen(GLOBAL_DAILY_LIMIT));
  for (const [kind, limit] of Object.entries({wish: 500, fulfilled: 200})) {
    for (const globalCount of [0, limit - 1]) assert.deepEqual(acceptGlobal({kind, globalCount}), {ok: true});
    for (const globalCount of [limit, limit + 1]) assert.deepEqual(acceptGlobal({kind, globalCount}), {ok: false, status: 429, error: '今日は星空がいっぱいです。また明日どうぞ。'});
  }
});

test('回線制限は経路別で、IPがなければunknown。未設定・障害では通す', async () => {
  for (const ip of [null, '192.0.2.1']) {
    const request = new Request('https://example.com', {headers: ip ? {'CF-Connecting-IP': ip} : {}});
    assert.equal(await rateLimit(request, '/api/stars', {}), null);
    assert.equal(await rateLimit(request, '/api/stars', {STARS_LIMITER: {limit: async () => {throw Error('秘密');}}}), null);
    for (const success of [true, false]) {
      const response = await rateLimit(request, '/api/stars', {STARS_LIMITER: {limit: async ({key}) => {
        assert.equal(key, `/api/stars:${ip ?? 'unknown'}`);
        return {success};
      }}});
      if (success) assert.equal(response, null);
      else {assert.equal(response.status, 429); assert.deepEqual(await response.json(), {error: '少し時間をおいてください。'});}
    }
  }
});

test('5つのPOSTは制限を受けたらJSONもDBも読まない', async () => {
  for (const route of ['stars', 'stars/report', 'stars/return', 'stars/delete', 'orbits']) {
    const handler = compile(`../app/api/${route}/route.ts`, name => {
      if (name.endsWith('rate-limit')) return {rateLimit: (request, path, env) => {
        assert.equal(path, `/api/${route}`);
        return rateLimit(request, path, env);
      }};
      if (name === 'cloudflare:workers') return {env: {STARS_LIMITER: {limit: async () => ({success: false})}}};
      return {};
    });
    const response = await handler.POST({headers: new Headers(), json: () => {throw Error('読んではいけない');}});
    assert.equal(response.status, 429);
  }
});

test('飛行・帰還カード・帰還票のどれかが開いていれば読み直しを待つ', () => {
  for (const flying of [true, false]) for (const cardOpen of [true, false]) for (const receiptOpen of [true, false]) {
    assert.equal(WishState.canReloadWishes({flying, cardOpen, receiptOpen}), !flying && !cardOpen && !receiptOpen);
  }
});

const mission = readFileSync(new URL('../public/mission.js', import.meta.url), 'utf8');
test('変更通知だけを受け取り、他のlocalStorage変更では読み直さない', () => {
  let listener;
  let reloads = 0;
  const localStorage = {};
  const sandbox = {window: {addEventListener: (_, callback) => {listener = callback;}}, localStorage, CHANGED_KEY: 'changed', reloadPending: false, drainWishReload: () => {reloads++;}};
  const start = mission.indexOf("  window.addEventListener('storage', event => {");
  const end = mission.indexOf('\n  });', start) + 6;
  vm.runInNewContext(mission.slice(start, end), sandbox);
  listener({key: 'other', storageArea: localStorage});
  listener({key: 'changed', storageArea: {}});
  assert.equal(reloads, 0);
  listener({key: 'changed', storageArea: localStorage});
  assert.equal(reloads, 1);
  assert.equal(sandbox.reloadPending, true);
});
function functionSource(name) {
  const start = mission.search(new RegExp(`  (?:async )?function ${name}\\(`));
  const end = mission.indexOf('\n  }', start) + 4;
  assert.ok(start >= 0 && end > start);
  return mission.slice(start, end);
}

test('別タブの変更を保留し、閉じたあと最新の願いを読み直す。削除されたカプセルも消える', async () => {
  let reads = 0;
  let refreshes = 0;
  const next = [{id: 'new', status: 'returned', updatedAt: 2}];
  const sandbox = {WishState, database: {}, wishes: [{id: 'old'}], returningWish: {id: 'old'}, landed: true,
    reloadPending: true, reloading: false, returnFlight: {}, returnCard: {hidden: true}, receiptSheet: {hidden: true},
    store: async () => {reads++; return next;}, refreshInterface: () => {refreshes++;}, setMissionStep: () => {}, $: () => ({})};
  vm.createContext(sandbox);
  vm.runInContext(['reloadAllowed', 'reloadWishes', 'drainWishReload'].map(functionSource).join('\n'), sandbox);
  await sandbox.drainWishReload();
  assert.equal(reads, 0);
  sandbox.returnFlight = null;
  sandbox.returnCard.hidden = false;
  await sandbox.drainWishReload();
  assert.equal(reads, 0);
  sandbox.returnCard.hidden = true;
  sandbox.receiptSheet.hidden = false;
  await sandbox.drainWishReload();
  assert.equal(reads, 0);
  sandbox.receiptSheet.hidden = true;
  await sandbox.drainWishReload();
  assert.equal(reads, 1);
  assert.equal(refreshes, 1);
  assert.equal(sandbox.returningWish.id, 'new');
  next.length = 0;
  sandbox.reloadPending = true;
  await sandbox.drainWishReload();
  assert.equal(sandbox.returningWish, null);
  assert.equal(sandbox.landed, false);
});

test('読み直しの途中で帰還を始めた場合は表示を保ち、読み込み失敗も再試行できる', async () => {
  const status = {};
  const old = [{id: 'old'}];
  const sandbox = {WishState, database: {}, wishes: old, reloadPending: true, reloading: false,
    returnFlight: null, returnCard: {hidden: true}, receiptSheet: {hidden: true},
    store: async () => {sandbox.returnFlight = {}; return [];}, refreshInterface: () => {throw Error('表示を変えない');}, $: () => status};
  vm.createContext(sandbox);
  vm.runInContext(['reloadAllowed', 'reloadWishes', 'drainWishReload'].map(functionSource).join('\n'), sandbox);
  await sandbox.drainWishReload();
  assert.equal(sandbox.wishes, old);
  assert.equal(sandbox.reloadPending, true);
  sandbox.returnFlight = null;
  sandbox.store = async () => {throw Error('IndexedDB');};
  await sandbox.drainWishReload();
  assert.equal(sandbox.wishes, old);
  assert.equal(sandbox.reloadPending, true);
  assert.equal(sandbox.reloading, false);
  assert.match(status.textContent, /読み込めません/);
});

test('IndexedDBの保存・削除・全消去は完了後だけ変更を通知する', async () => {
  for (const operation of ['put', 'delete', 'clear', 'getAll']) {
    const notices = [];
    const request = {};
    const objectStore = {put: () => request, delete: () => {}, clear: () => {}, getAll: () => request};
    const transaction = {objectStore: () => objectStore};
    const sandbox = {database: {transaction: () => transaction}, CHANGED_KEY: 'changed', Date, Math, writeStorage: (...args) => notices.push(args)};
    vm.createContext(sandbox);
    vm.runInContext(['localStore', 'deleteLocalWishes'].map(functionSource).join('\n'), sandbox);
    const pending = ['delete', 'clear'].includes(operation)
      ? sandbox.deleteLocalWishes(['w'], operation === 'clear')
      : sandbox.localStore(operation === 'put' ? 'readwrite' : 'readonly', object => object[operation]());
    assert.equal(notices.length, 0);
    transaction.oncomplete();
    await pending;
    assert.equal(notices.length, operation === 'getAll' ? 0 : 1);
  }
});

test('IndexedDBの保存が失敗した場合は変更を通知しない', async () => {
  const notices = [];
  const transaction = {error: new Error('保存できない'), objectStore: () => ({put: () => ({})})};
  const sandbox = {database: {transaction: () => transaction}, CHANGED_KEY: 'changed', Date, Math, writeStorage: (...args) => notices.push(args)};
  vm.createContext(sandbox);
  vm.runInContext(functionSource('localStore'), sandbox);
  const pending = sandbox.localStore('readwrite', object => object.put({}));
  transaction.onabort();
  await assert.rejects(pending, /保存できない/);
  assert.equal(notices.length, 0);
});
