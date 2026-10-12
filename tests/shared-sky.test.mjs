import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as Stars from '../app/api/stars/rules.mjs';
import * as PublicStars from '../public/public-stars.js';
import * as WishState from '../public/wish-state.js';
import * as Sky from '../public/sky.js';
import * as FloatingWishes from '../public/floating-wishes.js';
import {createKeyedQueue} from '../public/keyed-queue.js';

const orbitId = '3f2b8c1e-9a4d-4b7e-8c21-5d6e7f809a1b';
const otherId = '7a1c2d3e-4f50-4a6b-9c7d-8e9f0a1b2c3d';
const id = n => `c0ffee00-1234-4abc-8def-${String(n).padStart(12, '0')}`;
const row = (n, extra = {}) => ({id: id(n), orbitId: otherId, kind: 'wish', text: `願い${n}`, status: 'visible', expiresAt: Date.now() + 100000, ...extra});
const source = readFileSync(new URL('../public/mission.js', import.meta.url), 'utf8');
function functionSource(name) {
  const match = new RegExp(`  (?:async )?function ${name}\\(`).exec(source);
  assert.ok(match, name);
  return source.slice(match.index, source.indexOf('\n  }', match.index) + 4);
}

test('公開IDの付け外しは状態・日付・番号を変えず、不正なIDは拒否する', () => {
  const wish = WishState.createWish({id: id(1), text: '海へ', now: 100, seq: 2});
  const published = WishState.setPublicStarId(wish, id(2));
  assert.deepEqual(published, {...wish, publicStarId: id(2)});
  assert.deepEqual(WishState.setPublicStarId(published, null), wish);
  assert.equal(wish.publicStarId, undefined);
  assert.throws(() => WishState.setPublicStarId(wish, 'x'));
});

test('帰還は本人だけ、最初の帰還から30日。再送でも延びず保留は保留のまま', () => {
  const star = row(1, {orbitId, status: 'held'});
  const returned = Stars.returnedStar(star, orbitId, 100);
  assert.deepEqual(returned, {returnedAt: 100, expiresAt: 100 + 30 * 86400000});
  assert.equal(Stars.returnedStar(star, otherId, 100), null);
  assert.equal(Stars.returnedStar(undefined, orbitId, 100), null);
  assert.deepEqual(Stars.returnedStar({...star, ...returned}, orbitId, 1000), returned);
  assert.equal(star.status, 'held');
  assert.equal(Stars.parseReturn({starId: id(1), orbitId}).ok, true);
  for (const body of [null, [], {}, {starId: id(1), orbitId: 'x'}]) assert.equal(Stars.parseReturn(body).ok, false);
});

test('指定星は本人の星でも表示するが、保留・非表示・期限切れは出さない', () => {
  const star = row(1, {orbitId, expiresAt: 1000});
  assert.equal(Stars.isShowable(star, {now: 500, ownOrbitId: orbitId}), false);
  assert.equal(Stars.isShowable(star, {now: 500, ownOrbitId: orbitId, starId: star.id}), true);
  for (const status of ['held', 'hidden']) assert.equal(Stars.isShowable({...star, status}, {now: 500, ownOrbitId: orbitId, starId: star.id}), false);
  assert.equal(Stars.isShowable(star, {now: 1000, starId: star.id}), false);
  const rows = Array.from({length: 24}, (_, i) => row(i + 1));
  const stars = Stars.focusedStars(rows, row(24, {returnedAt: 0}));
  assert.equal(stars.length, 24);
  assert.equal(stars[0].id, id(24));
  assert.equal(stars[0].focus, true);
  assert.equal(stars[0].returned, true);
  assert.equal(new Set(stars.map(s => s.id)).size, 24);
  assert.equal(stars.some(s => 'orbitId' in s), false);
});

test('IDで決めた星図の位置は赤経0〜360度、赤緯40〜85度に散らばる', () => {
  const seeds = Array.from({length: 100}, (_, n) => PublicStars.starSeed(id(n)));
  for (const seed of seeds) {
    assert.ok(seed.raDeg >= 0 && seed.raDeg < 360);
    assert.ok(seed.decDeg >= 40 && seed.decDeg <= 85);
  }
  assert.ok(new Set(seeds.map(s => s.decDeg)).size > 20);
  const seed = seeds[0];
  const now = Date.parse('2026-10-11T10:00Z');
  assert.notDeepEqual(Sky.projectPolarStar(seed.raDeg, seed.decDeg, now, 35.68, 139.76, 400, 800), Sky.projectPolarStar(seed.raDeg, seed.decDeg, now + 3600000, 35.68, 139.76, 400, 800));
});

test('自分の星は2倍の重み。同じ星の連続を避け、他人の星も選べる', () => {
  const own = {wish: {id: 'own'}};
  const other = {star: {id: 'other'}};
  const points = [own, other];
  assert.equal(FloatingWishes.nextAutoStar(points, null, 0), own);
  assert.equal(FloatingWishes.nextAutoStar(points, null, .66), own);
  assert.equal(FloatingWishes.nextAutoStar(points, null, 2 / 3), other);
  assert.equal(FloatingWishes.nextAutoStar(points, 'own', 0), other);
  assert.equal(FloatingWishes.nextAutoStar(points, 'other', .99), own);
  assert.equal(FloatingWishes.nextAutoStar([], null, 0), null);
});

test('送信待ちは同じ言葉でも願いIDごとに区別し、削除を帰還より優先する', () => {
  let queue = PublicStars.enqueue([], {kind: 'wish', text: '海へ', wishId: id(1)}, 0);
  queue = PublicStars.enqueue(queue, {kind: 'wish', text: '海へ', wishId: id(2)}, 1);
  assert.deepEqual(queue.map(s => s.wishId), [id(1), id(2)]);
  queue = PublicStars.enqueue(queue, {kind: 'wish', text: '海へ', wishId: id(1)}, 2);
  assert.equal(queue.length, 2);
  assert.equal(PublicStars.pruneQueue([{kind: 'wish', text: '海', queuedAt: 0, wishId: 1}], 1).length, 0);
  assert.equal(PublicStars.pruneQueue([{kind: 'wish', text: '海', queuedAt: 0, publicStarId: id(1)}], PublicStars.QUEUE_MAX_AGE_MS + 1).length, 1);
  let actions = PublicStars.enqueueAction([], {starId: id(1), action: 'return'});
  actions = PublicStars.enqueueAction(actions, {starId: id(1), action: 'delete'});
  actions = PublicStars.enqueueAction(actions, {starId: id(1), action: 'return'});
  assert.deepEqual(actions, [{starId: id(1), action: 'delete'}]);
});

test('QRは公開した星に向かい、自分だけの星と不正なIDはトップに戻る', () => {
  assert.equal(PublicStars.receiptUrl('https://example.com', id(1)), `https://example.com/?star=${id(1)}`);
  for (const value of [null, undefined, '', '?bad']) assert.equal(PublicStars.receiptUrl('https://example.com', value), 'https://example.com/');
});

function loadRoute(file, db, enabled = true) {
  const exports = {};
  const table = new Proxy({}, {get: (_, key) => key});
  const op = {eq: (key, value) => row => row[key] === value, ne: (key, value) => row => row[key] !== value, gt: (key, value) => row => row[key] > value, gte: (key, value) => row => row[key] >= value, lt: (key, value) => row => row[key] < value, count: () => 'count', and: (...conditions) => row => conditions.every(c => c(row)), sql: (strings, ...values) => ({strings, values})};
  const require = name => {
    if (name.endsWith('rate-limit')) return {rateLimit: async () => null};
    if (name === 'cloudflare:workers') return {env: {DB: {}, PUBLIC_STARS_ENABLED: enabled ? 'true' : 'false'}};
    if (name === 'drizzle-orm') return op;
    if (name.endsWith('/db')) return {getDb: () => db};
    if (name.endsWith('/schema')) return {publicStars: table, orbits: table};
    if (name.endsWith('rules.mjs')) return Stars;
    if (name.endsWith('/watch/settings')) return {readPaused: async () => false};
    if (name.endsWith('error-kind.mjs')) return {errorKind: () => 'UnknownError'};
    throw Error(name);
  };
  const source = readFileSync(new URL(`../app/api/stars/${file}`, import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, {exports, require, Response, URL, Date, console: {error: () => {}}});
  return exports;
}

test('GET実装も、本人の指定星だけを含め、保留・非表示・期限切れを除く', async () => {
  for (const extra of [{}, {status: 'held'}, {status: 'hidden'}, {expiresAt: 0}]) {
    const stars = [row(1, {orbitId, returnedAt: 0, ...extra}), row(2), row(3, {orbitId})];
    const db = {select: () => {
      let condition = () => true;
      const chain = {from: () => chain, where: value => {condition = value; return chain;}, orderBy: () => chain, limit: async n => stars.filter(condition).slice(0, n)};
      return chain;
    }};
    const route = loadRoute('route.ts', db);
    const response = await route.GET(new Request(`https://example.com/api/stars?orbit=${orbitId}&star=${id(1)}`));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(data.stars.map(s => s.id), Object.keys(extra).length ? [id(2)] : [id(1), id(2)]);
    if (!Object.keys(extra).length) {assert.equal(data.stars[0].focus, true); assert.equal(data.stars[0].returned, true);}
    assert.equal((await route.GET(new Request('https://example.com/api/stars?star=bad'))).status, 400);
  }
  assert.deepEqual(await (await loadRoute('route.ts', null, false).GET(new Request('https://example.com/api/stars'))).json(), {enabled: false});
});

test('帰還APIは本人だけを更新し、回数制限では星も読まない', async () => {
  for (const owner of [undefined, otherId, orbitId]) {
    let updates = 0;
    const db = {get: async () => ({value: '1'}), run: async () => {}, select: () => ({from: () => ({where: () => ({limit: async () => owner ? [row(1, {orbitId: owner})] : []})})}), update: () => ({set: values => ({where: async condition => {assert.equal(condition(row(1, {orbitId})), true); assert.equal(condition(row(1)), false); assert.equal(values.expiresAt.values.at(-1), Stars.RETURN_TTL_MS); updates++;}})})};
    const response = await loadRoute('return/route.ts', db).POST(new Request('https://example.com/api/stars/return', {method: 'POST', body: JSON.stringify({starId: id(1), orbitId})}));
    assert.equal(response.status, owner === orbitId ? 200 : 404);
    assert.equal(updates, owner === orbitId ? 1 : 0);
  }
  const db = {get: async () => ({value: '11'}), select: () => {throw Error('上限の後には読まない');}};
  assert.equal((await loadRoute('return/route.ts', db).POST(new Request('https://example.com/api/stars/return', {method: 'POST', body: JSON.stringify({starId: id(1), orbitId})}))).status, 429);
});

test('投稿の応答が失われたあとの再送は、同じIDの星を増やさず、他人のIDは使わせない', async () => {
  const stars = [];
  let inserts = 0;
  let full = false;
  const db = {
    select: selection => {
      let condition = () => true;
      const items = () => selection?.number ? [{id: orbitId, number: 1}] : selection?.value ? [{value: full ? 500 : 0}] : stars.filter(condition);
      const chain = {from: () => chain, where: value => {condition = value; return chain;}, limit: async n => items().slice(0, n), then: resolve => resolve(items())};
      return chain;
    },
    run: async statement => {
      if (statement.strings[0].includes('INSERT OR IGNORE INTO public_stars')) {
        const [id, orbitId, kind, text, status, createdAt, expiresAt] = statement.values;
        if (!stars.some(star => star.id === id)) {stars.push({id, orbitId, kind, text, status, createdAt, expiresAt}); inserts++;}
      }
    },
  };
  const route = loadRoute('route.ts', db);
  const post = body => route.POST(new Request('https://example.com/api/stars', {method: 'POST', body: JSON.stringify(body)}));
  const body = {orbitId, kind: 'wish', text: '海へ', starId: id(5)};
  const first = await post(body);
  assert.equal(first.status, 200);
  assert.equal((await first.json()).id, id(5));
  full = true;
  assert.equal((await post(body)).status, 200);
  const rejected = await post({...body, starId: id(6)});
  assert.equal(rejected.status, 429);
  assert.equal((await rejected.json()).error, '今日は星空がいっぱいです。また明日どうぞ。');
  assert.equal(inserts, 1);
  assert.equal((await post({...body, orbitId: otherId})).status, 404);
  assert.equal((await post({...body, text: '別の願い'})).status, 404);
  assert.equal((await post({...body, starId: 'bad'})).status, 400);
});

test('数えたあとに別の投稿が入ってもSQLiteの挿入で全体上限を越えない', async () => {
  const sqlite = new DatabaseSync(':memory:');
  try {
    sqlite.exec('CREATE TABLE public_stars (id TEXT PRIMARY KEY, orbit_id TEXT, kind TEXT, text TEXT, status TEXT, reports INTEGER, created_at INTEGER, expires_at INTEGER)');
    const now = Date.now();
    const seed = sqlite.prepare('INSERT INTO public_stars VALUES (?, ?, ?, ?, ?, 0, ?, ?)');
    for (let i = 0; i < 499; i++) seed.run(`seed-${i}`, otherId, 'wish', '海へ', 'held', now, now + 86400000);
    const db = {
      select: selection => {
        let condition = () => true;
        const items = () => {
          if (selection?.number) return [{number: 1}];
          // 両方の投稿が上限の手前で数えた場合を再現する。
          if (selection?.value) return [{value: 0}];
          if (selection?.id) return [];
          return sqlite.prepare('SELECT id, orbit_id AS orbitId, kind, text, status, created_at AS createdAt, expires_at AS expiresAt FROM public_stars').all().filter(condition);
        };
        const chain = {from: () => chain, where: value => {condition = value; return chain;}, limit: async n => items().slice(0, n), then: resolve => resolve(items())};
        return chain;
      },
      run: async statement => {
        if (statement.strings[0].includes('INSERT OR IGNORE INTO public_stars')) sqlite.prepare(statement.strings.join('?')).run(...statement.values);
      },
    };
    const route = loadRoute('route.ts', db);
    const post = starId => route.POST(new Request('https://example.com/api/stars', {method: 'POST', body: JSON.stringify({orbitId, kind: 'wish', text: '海へ', starId})}));
    const responses = await Promise.all([post(id(5)), post(id(6))]);
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 429]);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM public_stars').get().n, 500);
    const acceptedId = responses[0].status === 200 ? id(5) : id(6);
    assert.equal((await post(acceptedId)).status, 200);
  } finally {sqlite.close();}
});

function queueScene() {
  const saved = new Map();
  const actions = [];
  const sandbox = {PublicStars, WishState, createWishId: () => id(9), growthQueue: createKeyedQueue(), navigator: {onLine: true}, starsEnabled: true, wishes: [WishState.createWish({id: id(1), text: '海へ', now: 0})], returningWish: null, PUBLISH_QUEUE_KEY: 'queue', STAR_ACTIONS_KEY: 'actions', flushingQueue: false, Date, Map, refreshStarsInterface: () => {}, readJson: (key, fallback) => saved.has(key) ? JSON.parse(saved.get(key)) : fallback, writeStorage: (key, value) => saved.set(key, value), flushStarActions: () => {}, queueStarAction: (action, starId) => actions.push({action, starId}), store: async (_, op) => op({put: item => item}), postStar: async () => ({response: {ok: true}, data: {id: id(2), status: 'visible'}})};
  vm.createContext(sandbox);
  vm.runInContext(['queuePublish', 'attachPublishedStar', 'publishStar', 'flushPublishQueue'].map(functionSource).join('\n'), sandbox);
  return {sandbox, saved, actions};
}

test('オフラインで控えた願いに、接続後の公開IDを付ける。受け取っていれば帰還、帰還票で出していれば「やってみる」を送る', async () => {
  // 着地しただけ（まだ選んでいない）なら、星は預けた願いのまま
  for (const [label, prepare, expected] of [
    ['着地しただけ', wish => WishState.markReturned(wish, 10), []],
    ['もう少し預けた', wish => WishState.decide(WishState.markReturned(wish, 10), 'later', 20), []],
    ['受け取った', wish => WishState.decide(WishState.markReturned(wish, 10), 'try', 20), [{action: 'return', starId: id(2)}]],
    ['受け取って、みんなの空に出した', wish => ({...WishState.decide(WishState.markReturned(wish, 10), 'try', 20), shareDoing: true}), [{action: 'doing', starId: id(2)}]],
  ]) {
    const {sandbox, actions} = queueScene();
    sandbox.navigator.onLine = false;
    await sandbox.publishStar('wish', '海へ', id(1));
    assert.equal(sandbox.wishes[0].publicStarId, undefined);
    assert.equal(sandbox.readJson('queue', [])[0].wishId, id(1));
    sandbox.wishes[0] = prepare(sandbox.wishes[0]);
    sandbox.navigator.onLine = true;
    await sandbox.flushPublishQueue();
    assert.equal(sandbox.wishes[0].publicStarId, id(2), label);
    assert.deepEqual(actions, expected, label);
    assert.equal(sandbox.readJson('queue', []).length, 0);
  }
});

test('公開後の端末保存の失敗ではIDを控え、再送で二重公開しない', async () => {
  const {sandbox} = queueScene();
  let calls = 0;
  sandbox.postStar = async () => {calls++; return {response: {ok: true}, data: {id: id(2), status: 'held'}};};
  sandbox.store = async () => {throw Error('保存できない');};
  await sandbox.publishStar('wish', '海へ', id(1));
  assert.equal(sandbox.readJson('queue', [])[0].publicStarId, id(2));
  sandbox.store = async (_, op) => op({put: item => item});
  await sandbox.flushPublishQueue();
  assert.equal(calls, 1);
  assert.equal(sandbox.wishes[0].publicStarId, id(2));
});

test('公開の通信中に願いを消しても復活させず、公開星の削除を控える', async () => {
  const {sandbox, actions} = queueScene();
  sandbox.postStar = async () => {sandbox.wishes = []; sandbox.writeStorage('queue', '[]'); return {response: {ok: true}, data: {id: id(2), status: 'visible'}};};
  await sandbox.publishStar('wish', '海へ', id(1));
  assert.equal(sandbox.wishes.length, 0);
  assert.ok(actions.some(item => item.action === 'delete' && item.starId === id(2)));
});

test('サーバー停止と一時的な失敗・429では送信待ちを残す', async () => {
  for (const status of [404, 429, 503]) {
    const {sandbox} = queueScene();
    sandbox.postStar = async () => ({response: {ok: false, status}, data: status === 404 ? {enabled: false} : {error: 'あとで'}});
    await sandbox.publishStar('wish', '海へ', id(1));
    assert.equal(sandbox.readJson('queue', []).length, 1);
    assert.equal(sandbox.wishes[0].publicStarId, undefined);
  }
});

test('帰還票の QR から来たら、入口やシートが閉じたあと、みんなの空でその星を見せる（1回だけ）', () => {
  let home = false;
  const opened = [];
  const sandbox = {homeIsVisible: () => home, hideFloatingWish: () => {}, homeSince: null, openingCard: false, focusPending: true, requestedStarId: id(1),
    otherStars: [{id: id(1), text: '海へ', focus: true}], reducedMotion: true, showFloatingWish: () => {}, openEveryone: starId => opened.push(starId), lastAutoWishId: null};
  vm.createContext(sandbox);
  vm.runInContext(functionSource('updateFloatingWish'), sandbox);
  sandbox.updateFloatingWish(0);
  assert.equal(opened.length, 0);
  home = true;
  sandbox.updateFloatingWish(100);
  sandbox.updateFloatingWish(200);
  assert.deepEqual(opened, [id(1)]);
});

test('帰還と公開IDの保存が重なっても、帰還した願いからIDを落とさない', async () => {
  const {sandbox, actions} = queueScene();
  const wish = sandbox.wishes[0];
  const element = {classList: {add: () => {}}, hidden: true};
  Object.assign(sandbox, {returnFlight: {wish}, pendingLocation: {lat: 35.68, lon: 139.76}, trialUsed: () => true, TRIAL_KEY: 'trial', setTimeout: () => {}, setMissionStep: () => {}, $: () => element, refreshInterface: () => {}, playRecoveryTone: () => {}, landed: false});
  vm.runInContext(functionSource('finishReturn'), sandbox);
  await Promise.all([sandbox.attachPublishedStar(wish.id, id(2)), sandbox.finishReturn(wish)]);
  assert.equal(sandbox.wishes[0].publicStarId, id(2));
  assert.equal(sandbox.wishes[0].status, 'returned');
  // 着地しただけでは、みんなの空の星は変えない（受け取るか、もう少し預けるかを選んだときに送る）
  assert.equal(actions.some(item => item.action === 'return'), false);
});

test('帰還と削除の送信待ちはオフライン・503・429・機能停止で残し、成功と星の404だけで外す', async () => {
  for (const action of ['return', 'delete']) {
    for (const status of [200, 404, 429, 503, 'disabled', 'offline']) {
      const saved = new Map();
      const element = {};
      const sandbox = {PublicStars, readJson: (key, fallback) => saved.has(key) ? JSON.parse(saved.get(key)) : fallback, writeStorage: (key, value) => saved.set(key, value), STAR_ACTIONS_KEY: 'actions', flushingActions: false, actionsAgain: false, navigator: {onLine: status !== 'offline'}, starsEnabled: true, orbitId: () => orbitId, AbortSignal, setTimeout: () => {}, $: () => element, fetch: async (path, options) => {
        assert.equal(path, `/api/stars/${action}`);
        assert.deepEqual(JSON.parse(options.body), {starId: id(1), orbitId});
        return new Response(JSON.stringify(status === 'disabled' ? {enabled: false} : {ok: status === 200}), {status: status === 'disabled' ? 404 : status});
      }};
      vm.createContext(sandbox);
      vm.runInContext(['requestTimeout', 'queueStarAction', 'flushStarActions'].map(functionSource).join('\n'), sandbox);
      sandbox.queueStarAction(action, id(1));
      await sandbox.flushStarActions();
      assert.equal(sandbox.readJson('actions', []).length, [200, 404].includes(status) ? 0 : 1, `${action} ${status}`);
    }
  }
});

test('わたしの空では、他人の星は同じ北極中心の投影に淡く描くだけで、触れて読めない', () => {
  const stars = [row(1), row(2, {returned: true}), row(3, {focus: true})];
  const now = Date.parse('2026-10-11T10:00Z');
  stars.forEach(star => {star.expiresAt = now + 1000;});
  const calls = [];
  const context = {save: () => {}, restore: () => {}, beginPath: () => {}, arc: (...args) => calls.push({args, alpha: context.globalAlpha}), fill: () => {}, stroke: () => {}};
  const sandbox = {PublicStars, Sky, otherStars: stars, otherStarPoints: [], starsEnabled: true, Date: {now: () => now}, pendingLocation: {lat: 35.68, lon: 139.76}, width: 400, height: 800, context, OWN_REACH: 0.366};
  vm.createContext(sandbox);
  vm.runInContext(['skyFrame', 'polar', 'drawOtherStars'].map(functionSource).join('\n'), sandbox);
  sandbox.drawOtherStars(0);
  // 触れる点には入れない（タップの取り違えをなくすため。読むのはみんなの空で）
  assert.equal(sandbox.otherStarPoints.length, 0);
  const seed = PublicStars.starSeed(stars[0].id);
  const point = Sky.projectPolarStar(seed.raDeg, seed.decDeg, now, 35.68, 139.76, 400, 800);
  assert.deepEqual(calls[0].args.slice(0, 2), [point.x, point.y]);
  assert.ok(calls[1].alpha < calls[0].alpha);
  assert.ok(calls.every(call => call.alpha <= 0.4), '背景の淡い光');
  assert.equal(calls.some(call => call.args[2] === 9), false, '指定星の輪は、みんなの空で付ける');
  sandbox.starsEnabled = false;
  sandbox.drawOtherStars(0);
  assert.equal(sandbox.otherStarPoints.length, 0);
});
import {DatabaseSync} from 'node:sqlite';

test('送信中に「やってみる」が追加されても、終わったあとにもう一度送る', async () => {
  const saved = new Map();
  const sent = [];
  let release;
  const first = new Promise(resolve => { release = resolve; });
  const sandbox = {PublicStars, readJson: (key, fallback) => saved.has(key) ? JSON.parse(saved.get(key)) : fallback, writeStorage: (key, value) => saved.set(key, value), STAR_ACTIONS_KEY: 'actions', flushingActions: false, actionsAgain: false, navigator: {onLine: true}, starsEnabled: true, orbitId: () => orbitId, AbortSignal, setTimeout: () => {}, $: () => ({}), fetch: async (path, options) => {
    sent.push([path, JSON.parse(options.body).starId]);
    if (sent.length === 1) await first;
    return new Response(JSON.stringify({ok: true}), {status: 200});
  }};
  vm.createContext(sandbox);
  vm.runInContext(['requestTimeout', 'queueStarAction', 'flushStarActions'].map(functionSource).join('\n'), sandbox);
  sandbox.queueStarAction('return', id(1));
  const running = sandbox.flushStarActions();
  await new Promise(resolve => setImmediate(resolve));
  sandbox.queueStarAction('doing', id(2));
  await sandbox.flushStarActions();
  release();
  await running;
  assert.deepEqual(sent, [['/api/stars/return', id(1)], ['/api/stars/doing', id(2)]]);
  assert.equal(sandbox.readJson('actions', []).length, 0);
});
