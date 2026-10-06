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
    threeReady: true, northLineStarted: new Map(), northSky: new Map(Sky.NORTH_CONSTELLATIONS.map(g => [g.id,
      g.stars.map(star => Sky.projectPolarStar(star.raDeg, star.decDeg, Date.parse('2026-10-06T15:00Z'),35.68,139.76,400,800))])),
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
  const point = sandbox.northSky.get('big-dipper')[0];
  assert.deepEqual(calls[0], ['comet',200,650,point.x,point.y,.5]);
  calls.length = 0;
  sandbox.launchFlight = null;
  sandbox.returnFlight = {wish: sandbox.wishes[0], startedAt: 0};
  sandbox.drawFlight(30);
  assert.deepEqual(calls[0], ['comet',point.x,point.y,200,650,.5]);
});

test('3Dの有無によらず同じ投影位置に描き、地平線下でも星と完成した線が残る', () => {
  const {sandbox, calls} = scene([1]);
  sandbox.drawWishStars(1000);
  const threePoint = calls.find(c => c[0] === 'arc').slice(1,3);
  calls.length = 0;
  sandbox.threeReady = false;
  sandbox.drawWishStars(1000);
  assert.deepEqual(calls.find(c => c[0] === 'arc').slice(1,3), threePoint);
  calls.length = 0;
  sandbox.northSky.get('big-dipper')[0].altitude = -1;
  sandbox.drawWishStars(1000);
  assert.equal(calls.filter(c => c[0] === 'arc').length, 1);
  assert.deepEqual(calls.find(c => c[0] === 'arc').slice(1,3), threePoint);
  const complete = scene([1,2,3,4,5,6,7]);
  complete.sandbox.northSky.get('big-dipper').forEach(point => { point.altitude = -10; });
  complete.sandbox.drawWishStars(1000);
  assert.equal(complete.calls.filter(c => c[0] === 'stroke').length, 7);
  assert.equal(complete.calls.filter(c => c[0] === 'arc').length, 7);
});

test('背景と願いは同じ投影を使い、サイズ変更と時刻更新で一緒に動く', () => {
  const {sandbox, calls} = scene([1]);
  let now = Date.parse('2026-10-06T15:00Z');
  const star = Sky.NORTH_CONSTELLATIONS[0].stars[0];
  Object.assign(sandbox, {
    Date: {now: () => now}, pendingLocation: {lat:35.68,lon:139.76},
    catalog: {stars:[[star.raDeg,star.decDeg,2], [0,40,5], [0,39,5]]},
    radecTable:null, realItokawa:null, observerReading:{}, refreshThreeSky:()=>{},
  });
  sandbox.context.createLinearGradient = sandbox.context.createRadialGradient = () => ({addColorStop:()=>{}});
  sandbox.context.fillRect = () => {};
  vm.runInContext(['refreshSky','drawSpace'].map(functionSource).join('\n'), sandbox);
  for (const [width,height,at] of [[400,800,now],[800,400,now],[800,400,now+3600000]]) {
    Object.assign(sandbox,{width,height});
    now = at;
    sandbox.refreshSky();
    calls.length = 0;
    sandbox.drawSpace(1000);
    const background = calls.filter(c => c[0] === 'arc');
    assert.equal(background.length,2); // 地平線下は残し、赤緯40度未満だけ除く
    calls.length = 0;
    sandbox.drawWishStars(1000);
    assert.deepEqual(calls.find(c => c[0] === 'arc').slice(1,3), background[0].slice(1,3));
    const expected = Sky.projectPolarStar(star.raDeg,star.decDeg,now,35.68,139.76,width,height);
    assert.deepEqual(background[0].slice(1,3), [expected.x,expected.y]);
  }
});
