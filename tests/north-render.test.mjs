import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as Sky from '../public/sky.js';
import * as WishState from '../public/wish-state.js';
import * as Constellation from '../public/constellation.js';

// 実際の描画関数をCanvasの記録先につなぎ、星・線・飛行の振る舞いを確かめる。
const source = readFileSync(new URL('../public/mission.js', import.meta.url), 'utf8');
function functionSource(name) {
  const start = source.indexOf(`  function ${name}(`);
  const end = source.indexOf('\n  }', start) + 4;
  assert.ok(start >= 0 && end > start);
  return source.slice(start, end);
}
function scene(seqs) {
  const calls = [];
  const context = Object.fromEntries(['save','restore','beginPath','moveTo','lineTo','stroke','arc','fill'].map(name => [name, (...args) => calls.push([name,...args])]));
  const sandbox = {Sky, WishState, Constellation, context, width: 400, height: 800,
    wishes: seqs.map(seq => ({id: `w${seq}`, seq, status: 'waiting', createdAt: 0})),
    signalTimes: [], launchFlight: null, returnFlight: null, landed: false, reducedMotion: true,
    threeReady: true, northLineStarted: new Map(), northSky: new Map(Sky.NORTH_CONSTELLATIONS.map(g => [g.id, g.stars.map((_, i) => ({altitude: 45, azimuth: i * 5}))])),
    projectThreeStar: h => ({x: 100 + h.azimuth, y: 150, visible: true}),
    geometry: () => ({centerX: 200, centerY: 300, orbitX: 100, orbitY: 50, earthY: 650}),
    drawHayabusa: () => {}, drawOtherStars: () => {},
    drawComet: (...args) => calls.push(['comet', ...args]),
  };
  vm.createContext(sandbox);
  vm.runInContext(['projectNorthStar','wishStarPosition','drawWishStars','drawFlight'].map(functionSource).join('\n'), sandbox);
  return {sandbox, calls};
}

test('6つでは線なし、7つで北斗七星の7本だけ。文字を描くAPIを必要としない', () => {
  const incomplete = scene([1,2,3,4,5,6]);
  incomplete.sandbox.drawWishStars(1000);
  assert.equal(incomplete.calls.filter(c => c[0] === 'stroke').length, 0);
  const complete = scene([1,2,3,4,5,6,7]);
  complete.sandbox.drawWishStars(1000);
  assert.equal(complete.calls.filter(c => c[0] === 'stroke').length, 7);
  assert.equal(complete.calls.filter(c => c[0] === 'arc').length, 7);
  complete.calls.length = 0;
  complete.sandbox.returnFlight = {wish: complete.sandbox.wishes[0], startedAt: 0};
  complete.sandbox.drawWishStars(1000);
  assert.equal(complete.calls.filter(c => c[0] === 'stroke').length, 0);
  assert.equal(complete.calls.filter(c => c[0] === 'arc').length, 6);
});

test('上昇と帰還は同じ星の投影座標を使い、地球との間を飛ぶ', () => {
  const {sandbox, calls} = scene([1]);
  sandbox.launchFlight = {wish: sandbox.wishes[0], startedAt: 0};
  sandbox.drawFlight(30);
  assert.deepEqual(calls[0], ['comet',200,650,100,150,.5]);
  calls.length = 0;
  sandbox.launchFlight = null;
  sandbox.returnFlight = {wish: sandbox.wishes[0], startedAt: 0};
  sandbox.drawFlight(30);
  assert.deepEqual(calls[0], ['comet',100,150,200,650,.5]);
});

test('3Dなしでも簡易星図と同じ位置に描き、地平線下の星は描かない', () => {
  const {sandbox, calls} = scene([1]);
  sandbox.threeReady = false;
  sandbox.drawWishStars(1000);
  assert.deepEqual(calls.find(c => c[0] === 'arc').slice(1,3), [200,304]);
  calls.length = 0;
  sandbox.northSky.get('big-dipper')[0].altitude = -1;
  sandbox.drawWishStars(1000);
  assert.equal(calls.filter(c => c[0] === 'arc').length, 0);
});
