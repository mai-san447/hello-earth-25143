import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import {errorKind} from '../app/api/error-kind.mjs';
import * as stars from '../app/api/stars/rules.mjs';
import * as signals from '../app/api/signals/rules.mjs';
import * as art from '../app/api/art/rules.mjs';

const orbitId = '3f2b8c1e-9a4d-4b7e-8c21-5d6e7f809a1b';
const starId = 'c0ffee00-1234-4abc-8def-0123456789ab';
const secret = 'ログに残してはいけない願いの文章';
const cases = [
  ['art/route.ts', 'POST', {orbitId, text: secret}],
  ['orbits/route.ts', 'POST', {orbitId}],
  ['stars/route.ts', 'GET', null],
  ['stars/route.ts', 'POST', {orbitId, kind: 'wish', text: secret}],
  ['stars/report/route.ts', 'POST', {starId, reporterOrbitId: orbitId}],
  ['stars/signal/route.ts', 'POST', {starId}],
  ['wishes/route.ts', 'GET', null],
  ['wishes/route.ts', 'POST', {id: orbitId, text: secret, status: 'doing', createdAt: 1, updatedAt: 2}],
  ['wishes/route.ts', 'DELETE', {all: true}],
];

function loadRoute(file, error) {
  const logs = [];
  const exports = {};
  const fail = () => {throw error;};
  const env = {DB: {}, AI: {}, ART_ENABLED: 'true', PUBLIC_STARS_ENABLED: 'true'};
  const require = specifier => {
    if (specifier === 'cloudflare:workers') return {env};
    if (specifier.endsWith('error-kind.mjs')) return {errorKind};
    if (specifier.endsWith('/db')) return {getDb: fail};
    if (specifier.endsWith('/schema')) return {publicStars: {}, orbits: {}, starReports: {}, artUses: {}};
    if (specifier.endsWith('chatgpt-auth')) return {getChatGPTUser: async () => ({userId: 'user'})};
    if (specifier.endsWith('/supabase')) return {getSupabaseAdmin: fail};
    if (specifier.endsWith('rules.mjs')) return file.startsWith('art/') ? art : specifier.includes('signals') ? signals : stars;
    if (specifier.endsWith('/record')) return {};
    if (specifier === 'drizzle-orm') return new Proxy({}, {get: () => () => ({})});
    throw new Error(`Unexpected import: ${specifier}`);
  };
  const source = readFileSync(new URL(`../app/api/${file}`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(compiled, {exports, require, Response, URL, console: {error: (...args) => logs.push(args)}});
  return {exports, logs};
}

for (const [file, method, body] of cases) {
  test(`${file} ${method}：外部例外の本文・SQLパラメーターをログに出さず503を返す`, async () => {
    for (const name of ['DrizzleQueryError', secret]) {
      const error = Object.assign(new Error(secret), {name, query: `INSERT ${secret}`, params: [secret], cause: new Error(secret)});
      const {exports, logs} = loadRoute(file, error);
      const request = new Request('https://example.com/api/test', method === 'GET' ? {} : {method, body: JSON.stringify(body)});
      const response = await exports[method](request);
      assert.equal(response.status, 503);
      assert.equal(logs.length, 1);
      assert.equal(logs[0].length, 2);
      assert.equal(logs[0][1], name === 'DrizzleQueryError' ? name : 'UnknownError');
      assert.ok(logs[0].every(value => typeof value === 'string'));
      assert.ok(!JSON.stringify(logs).includes(secret));
      assert.ok(!(await response.text()).includes(secret));
    }
  });
}

test('APIの例外ログはすべて共通の固定種別を使う', () => {
  function walk(dir) {
    for (const entry of readdirSync(dir, {withFileTypes: true})) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) {walk(file); continue;}
      if (!file.endsWith('.ts')) continue;
      const source = readFileSync(file, 'utf8');
      for (const call of source.matchAll(/console\.(?:error|warn|log)\(([^;]+)\);/g)) {
        assert.match(call[1], /^"[^"]+", errorKind\(error\)$/u, file);
      }
    }
  }
  walk(fileURLToPath(new URL('../app/api/', import.meta.url)));
});
