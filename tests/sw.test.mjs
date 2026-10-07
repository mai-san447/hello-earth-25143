import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// インストールで使う pageKey('/') が例外にならないこと（相対の URL で失敗し、オフライン対応が成立していなかった）
const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const start = source.indexOf('function pageKey(');
const end = source.indexOf('\n}', start) + 2;

test('ページの保存キーは、相対の URL でも絶対の URL でも、パスだけになる', () => {
  const sandbox = {self: {location: {origin: 'https://example.com'}}, URL, Request: class { constructor(url) { this.url = url; } }};
  vm.createContext(sandbox);
  vm.runInContext(source.slice(start, end), sandbox);
  assert.equal(sandbox.pageKey('/').url, 'https://example.com/');
  assert.equal(sandbox.pageKey('https://example.com/?nfc=1').url, 'https://example.com/');
});
