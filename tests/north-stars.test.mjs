import test from 'node:test';
import assert from 'node:assert/strict';
import {NORTH_CONSTELLATIONS, northStarForSeq, completedNorthConstellations} from '../public/sky.js';
import {skyWishes, magnitude, recordStep} from '../public/wish-state.js';

test('北斗七星7つ、カシオペヤ5つ、北極星からこぐま7つの順に割り当てる', () => {
  const names = ['Dubhe','Merak','Phecda','Megrez','Alioth','Mizar','Alkaid','Caph','Schedar','Gamma Cas','Ruchbah','Segin','Polaris','Delta UMi','Epsilon UMi','Zeta UMi','Eta UMi','Pherkad','Kochab'];
  assert.deepEqual(names.map((_, i) => northStarForSeq(i + 1).star.name), names);
  assert.deepEqual(NORTH_CONSTELLATIONS.map(group => group.paths), [[[1,0,3,2,1],[3,4,5,6]],[[0,1,2,3,4]],[[0,1,2,3,4,5,6,3]]]);
});

test('全部の星がそろった星座だけ完成し、重複や欠けた番号では完成しない', () => {
  const seqs = Array.from({length: 19}, (_, i) => i + 1);
  assert.deepEqual(completedNorthConstellations(seqs.slice(0,6)), []);
  assert.deepEqual(completedNorthConstellations(seqs.slice(0,7)).map(g => g.id), ['big-dipper']);
  assert.deepEqual(completedNorthConstellations(seqs.slice(7,12)).map(g => g.id), ['cassiopeia']);
  assert.deepEqual(completedNorthConstellations(seqs.slice(12)).map(g => g.id), ['little-dipper']);
  assert.equal(completedNorthConstellations(seqs).length, 3);
  assert.deepEqual(completedNorthConstellations([1,2,3,4,5,6,20]), []);
  assert.equal(completedNorthConstellations([20,2,3,4,5,6,7]).length, 1);
});

test('20個目以降は19個周期で同じ恒星へ戻り、重なる位置だけ少しずらす', () => {
  for (let seq = 1; seq <= 19; seq++) {
    const first = northStarForSeq(seq), second = northStarForSeq(seq + 19);
    assert.equal(first.star, second.star);
    assert.equal(first.starIndex, second.starIndex);
    assert.equal(first.offsetX, 0);
    assert.equal(first.offsetY, 0);
    assert.ok(Math.abs(Math.hypot(second.offsetX, second.offsetY) - 5) < 1e-9);
  }
  assert.notDeepEqual(northStarForSeq(20), northStarForSeq(39));
  for (const invalid of [0,-1,1.5,NaN,Infinity,'1',Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => northStarForSeq(invalid), RangeError);
  }
});

test('waitingとdoingだけ空に灯し、doingは一歩ごとに明るくなる', () => {
  const wishes = ['waiting','doing','returned','done','later','expired'].map((status, i) => ({id: i, status, seq: i + 1}));
  assert.deepEqual(skyWishes(wishes).map(w => w.status), ['waiting','doing']);
  assert.equal(magnitude(wishes[1]), 6);
  assert.equal(magnitude(recordStep(wishes[1], Date.UTC(2026,9,7))), 5);
  assert.equal(magnitude(wishes[0]), null);
});
