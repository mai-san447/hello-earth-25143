import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

// Service Worker と同じく、グローバルの self に offlineRoute が置かれる形で読み込む
const sandbox = {self: {}, URL};
vm.runInNewContext(readFileSync(new URL('../public/offline-routes.js', import.meta.url), 'utf8'), sandbox);
const {offlineRoute} = sandbox.self;
const origin = 'https://morune-25143.morune-25143.workers.dev';
const route = (url, {method = 'GET', mode = 'cors'} = {}) => offlineRoute({url, method, mode, origin});

test('ページを開くときはネット優先（つながらなければ保存した版）', () => {
  assert.equal(route(`${origin}/`, {mode: 'navigate'}), 'page');
  assert.equal(route(`${origin}/?nfc=1`, {mode: 'navigate'}), 'page');
});

test('名前が変わらない自前の部品は、公開直後に古い版が混ざらないようネット優先', () => {
  for (const path of ['/mission.js', '/wish-state.js', '/style.css', '/itokawa-distance.json', '/manifest.webmanifest']) {
    assert.equal(route(`${origin}${path}`), 'fresh', path);
  }
});

test('ハッシュ付きの部品とアイコンは保存した版を先に出す', () => {
  assert.equal(route(`${origin}/_next/static/chunks/framework-abc.js`), 'asset');
  assert.equal(route(`${origin}/icons/icon-192.png`), 'asset');
});

test('3D星空の Three.js と Google Fonts も保存する', () => {
  assert.equal(route('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js'), 'asset');
  assert.equal(route('https://fonts.googleapis.com/css2?family=Inter', {mode: 'no-cors'}), 'asset');
  assert.equal(route('https://fonts.gstatic.com/s/inter/v1/a.woff2'), 'asset');
});

test('願いの保存API・ログイン・Service Worker 自身は保存しない', () => {
  for (const path of ['/api/wishes', '/signin-with-chatgpt?returnTo=%2F', '/signout-with-chatgpt', '/callback', '/sw.js']) {
    assert.equal(route(`${origin}${path}`, {mode: 'navigate'}), 'bypass', path);
  }
});

test('GET 以外と、関係のない外部サイトは触らない', () => {
  assert.equal(route(`${origin}/api/wishes`, {method: 'POST'}), 'bypass');
  assert.equal(route(`${origin}/`, {method: 'POST', mode: 'navigate'}), 'bypass');
  assert.equal(route('https://twitter.com/intent/tweet?text=a', {mode: 'navigate'}), 'bypass');
});
