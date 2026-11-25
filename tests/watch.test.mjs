import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as watch from '../app/api/watch/rules.mjs';
import * as stars from '../app/api/stars/rules.mjs';
import {CARE_WORDS, CARE_URL, careNotice} from '../public/care.js';
import {errorKind} from '../app/api/error-kind.mjs';

const token = 'a'.repeat(32);
const orbitId = '3f2b8c1e-9a4d-4b7e-8c21-5d6e7f809a1b';
const starId = 'c0ffee00-1234-4abc-8def-0123456789ab';
const other = 'c0ffee00-1234-4abc-8def-0123456789ac';

test('見守り認証：未設定・短い鍵では開かず、長さや文字が違う鍵も通さない', async () => {
  for (const WATCH_TOKEN of [undefined, '', 'a'.repeat(15)]) assert.equal(watch.watchEnabled({DB: {}, WATCH_TOKEN}), false);
  assert.equal(watch.watchEnabled({DB: {}, WATCH_TOKEN: token}), true);
  for (const supplied of ['', 'a', 'a'.repeat(31), 'a'.repeat(33), 'b'.repeat(32)]) assert.equal(await watch.compareToken(token, supplied), false);
  assert.equal(await watch.compareToken(token, token), true);
  for (const header of [null, token, `Basic ${token}`, `Bearer ${token} extra`]) assert.equal(await watch.authorized(token, header), false);
  assert.equal(await watch.authorized(token, `Bearer ${token}`), true);
});
test('見守り入力：許可した操作とUUIDだけ受け付ける', () => {
  for (const action of ['show', 'hide', 'delete']) assert.equal(watch.parseWatch({action, id: starId}).ok, true);
  for (const action of ['pause', 'resume']) assert.equal(watch.parseWatch({action}).ok, true);
  for (const body of [null, [], 1, {}, {action: 'show'}, {action: 'show', id: 'bad'}, {action: 'pause', id: starId}, {action: 'other', id: starId}]) assert.equal(watch.parseWatch(body).ok, false);
});
test('一時停止：未設定・不正値でも保留、再開後も注意語は保留', () => {
  for (const value of [undefined, '1', 'bad', '']) {
    assert.equal(watch.isPaused(value), true);
    assert.equal(stars.publishStatus('また散歩したい', watch.isPaused(value)), 'held');
  }
  assert.equal(stars.publishStatus('また散歩したい', watch.isPaused('0')), 'visible');
  assert.equal(stars.publishStatus('死にたい', false), 'held');
});
test('本人削除：所有者・入力・1分の回数の境界', () => {
  assert.equal(stars.ownsStar({orbitId}, orbitId), true);
  assert.equal(stars.ownsStar({orbitId}, other), false);
  assert.equal(stars.ownsStar(undefined, orbitId), false);
  assert.equal(stars.parseDelete({starId, orbitId}).ok, true);
  for (const body of [null, [], {starId, orbitId: 'bad'}, {starId: 'bad', orbitId}]) assert.equal(stars.parseDelete(body).ok, false);
  for (const count of [0, 9]) assert.equal(stars.canDelete(count), true);
  for (const count of [-1, 10, NaN, 1.5]) assert.equal(stars.canDelete(count), false);
});
test('端末内の案内：注意語を揃え、ふつうの願いは変えない', () => {
  for (const word of CARE_WORDS) {
    assert.ok(careNotice(`今は${word}`).includes(CARE_URL));
    assert.equal(stars.screenText(word).status, 'held');
  }
  assert.equal(careNotice('生きるのが つらい'), careNotice('生きるのがつらい'));
  for (const text of ['', null, '海に行きたい', '少しねむい']) assert.equal(careNotice(text), '');
  assert.equal(new Set(stars.CAUTION_WORDS).size, stars.CAUTION_WORDS.length);
});

function load(file, {db, env = {}, readPaused = async () => true, failures = {count: 0}} = {}) {
  const exports = {};
  const logs = [];
  const require = specifier => {
    if (specifier.endsWith('rate-limit')) return {rateLimit: async () => null};
    if (specifier === 'cloudflare:workers') return {env};
    if (specifier.endsWith('/db')) return {getDb: () => db};
    if (specifier.endsWith('/schema')) return {publicStars: {}, starReports: {}, watchSettings: {}, orbits: {}};
    if (specifier.endsWith('error-kind.mjs')) return {errorKind};
    if (specifier.endsWith('/settings')) return {readPaused, readFailures: async () => failures.count, recordFailure: async () => { failures.count += 1; }};
    if (specifier.endsWith('rules.mjs')) return file.startsWith('watch/') && specifier === './rules.mjs' ? watch : stars;
    if (specifier === 'drizzle-orm') return new Proxy({}, {get: (_, key) => key === 'sql' ? (strings, ...values) => ({strings, values}) : () => ({})});
    throw new Error(specifier);
  };
  const source = readFileSync(new URL(`../app/api/${file}`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(compiled, {exports, require, Response, Date, crypto, console: {error: (...args) => logs.push(args)}});
  return {exports, logs};
}
test('削除API：他人と存在しない星は同じ404、本人だけ星と通報を消す', async () => {
  for (const owner of [undefined, other, orbitId]) {
    let batches = 0;
    const chain = {from: () => chain, where: () => chain, limit: async () => owner ? [{orbitId: owner}] : []};
    const db = {get: async () => ({value: '1'}), run: async () => {}, select: () => chain, delete: () => chain, batch: async commands => {assert.equal(commands.length, 2); batches++;}};
    const {exports} = load('stars/delete/route.ts', {db, env: {DB: {}, PUBLIC_STARS_ENABLED: 'true'}});
    const response = await exports.POST(new Request('https://example.com/api/stars/delete', {method: 'POST', body: JSON.stringify({starId, orbitId})}));
    assert.equal(response.status, owner === orbitId ? 200 : 404);
    assert.equal(batches, owner === orbitId ? 1 : 0);
  }
});
test('見守りAPI：鍵なし404・不一致401でDBを読まず、ログにも鍵を残さない', async () => {
  for (const WATCH_TOKEN of [undefined, 'short', token]) {
    const {exports, logs} = load('watch/route.ts', {env: {DB: {}, WATCH_TOKEN}});
    const response = await exports.GET(new Request('https://example.com/api/watch', {headers: {Authorization: 'Bearer private-token'}}));
    assert.equal(response.status, WATCH_TOKEN === token ? 401 : 404);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.ok(!JSON.stringify(logs).includes('private-token'));
  }
});
test('一時停止の表が読めなくても、安全側にする', async () => {
  const db = {select() {throw new Error('private database details');}};
  const {exports, logs} = load('watch/settings.ts', {db});
  assert.equal(await exports.readPaused(), true);
  assert.equal(logs.length, 1);
  assert.ok(!JSON.stringify(logs).includes('private database details'));
});

test('投稿API：一時停止ならふつうの言葉もheldで保存・応答する', async () => {
  for (const paused of [true, false]) {
    let saved;
    let selection;
    const chain = {from: () => chain, where: () => chain, limit: async () => saved ? [saved] : [{number: 1}], then: resolve => resolve(selection?.value ? [{value: 0}] : [])};
    const db = {select: value => {selection = value; return chain;}, run: async statement => {
      if (statement.strings[0].includes('INSERT OR IGNORE INTO public_stars')) {
        const [id, orbitId, kind, text, status, createdAt, expiresAt] = statement.values;
        saved = {id, orbitId, kind, text, status, createdAt, expiresAt};
      }
    }};
    const {exports} = load('stars/route.ts', {db, env: {DB: {}, PUBLIC_STARS_ENABLED: 'true'}, readPaused: async () => paused});
    const response = await exports.POST(new Request('https://example.com/api/stars', {method: 'POST', body: JSON.stringify({orbitId, kind: 'wish', text: '散歩したい'})}));
    assert.equal(response.status, 200);
    assert.equal(saved.status, paused ? 'held' : 'visible');
    assert.equal((await response.json()).status, saved.status);
  }
});
test('削除API：上限を越えた操作では、星を調べず429にする', async () => {
  const db = {get: async () => ({value: '11'}), select: () => {throw new Error('星を読んではいけない');}};
  const {exports} = load('stars/delete/route.ts', {db, env: {DB: {}, PUBLIC_STARS_ENABLED: 'true'}});
  const response = await exports.POST(new Request('https://example.com/api/stars/delete', {method: 'POST', body: JSON.stringify({starId, orbitId})}));
  assert.equal(response.status, 429);
});
test('見守りAPI：再表示は通報数を戻し、削除は星と通報をまとめて消す', async () => {
  for (const action of ['show', 'hide', 'delete', 'pause', 'resume']) {
    let setting;
    let change;
    let batches = 0;
    const chain = {where: () => chain, returning: async () => [{id: starId}]};
    const db = {
      update: () => ({set: value => {change = value; return chain;}}),
      insert: () => ({values: value => {setting = value; return {onConflictDoUpdate: async () => {}};}}),
      delete: () => chain,
      batch: async commands => {assert.equal(commands.length, 2); batches++; return [[], [{id: starId}]];},
    };
    const {exports} = load('watch/route.ts', {db, env: {DB: {}, WATCH_TOKEN: token}});
    const body = ['pause', 'resume'].includes(action) ? {action} : {action, id: starId};
    const response = await exports.POST(new Request('https://example.com/api/watch', {method: 'POST', headers: {Authorization: `Bearer ${token}`}, body: JSON.stringify(body)}));
    assert.equal(response.status, 200);
    if (action === 'show') assert.deepEqual({...change}, {status: 'visible', reports: 0});
    if (action === 'hide') assert.deepEqual({...change}, {status: 'hidden'});
    if (action === 'delete') assert.equal(batches, 1);
    if (action === 'pause' || action === 'resume') assert.equal(setting.value, action === 'pause' ? '1' : '0');
  }
});

test('見守りの合言葉は、全体で1分に5回まちがえたら、その1分は受け付けない', () => {
  assert.equal(watch.tooManyFailures(4), false);
  assert.equal(watch.tooManyFailures(5), true);
  assert.equal(watch.tooManyFailures('7'), true);
  // 同じ1分の中は同じ数え先、次の1分は新しい数え先
  assert.equal(watch.failBucket(60000 * 10), watch.failBucket(60000 * 10 + 59999));
  assert.notEqual(watch.failBucket(60000 * 10), watch.failBucket(60000 * 11));
  // 一時停止の設定と数え先が混ざらない
  assert.notEqual(watch.failBucket(0), 'paused');
});

test('見守りAPI：まちがいを数え、5回目のあとは合言葉を確かめずに429を返す', async () => {
  const failures = {count: 0};
  const {exports} = load('watch/route.ts', {env: {DB: {}, WATCH_TOKEN: token}, failures});
  const wrong = () => exports.GET(new Request('https://example.com/api/watch', {headers: {Authorization: 'Bearer wrong-passphrase'}}));
  for (let i = 0; i < 5; i += 1) assert.equal((await wrong()).status, 401);
  assert.equal(failures.count, 5);
  assert.equal((await wrong()).status, 429);
  // 止まっている間は、正しい合言葉でも数を増やさず待ってもらう
  const right = await exports.GET(new Request('https://example.com/api/watch', {headers: {Authorization: `Bearer ${token}`}}));
  assert.equal(right.status, 429);
  assert.equal(failures.count, 5);
});

test('まちがいの数が読めないときは、受け付けない側に倒す', async () => {
  const db = {select() {throw new Error('private database details');}};
  const {exports, logs} = load('watch/settings.ts', {db});
  assert.equal(watch.tooManyFailures(await exports.readFailures(Date.now())), true);
  assert.ok(!JSON.stringify(logs).includes('private database details'));
});
