import assert from 'node:assert/strict';
import {test} from 'node:test';
import {CHOICES, STATUS, daysWaited, decide, markReturned, pendingReturn, returnCandidates, waitedMessage} from '../public/wish-state.js';

const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const wish = (overrides = {}) => ({id: 'a', text: '朝の海を歩きたい', status: STATUS.WAITING, createdAt: at(2026, 9, 22), updatedAt: at(2026, 9, 22), ...overrides});

test('帰還の候補は軌道上の願いだけ', () => {
  const wishes = [wish({id: '1'}), wish({id: '2', status: STATUS.RETURNED}), wish({id: '3', status: STATUS.DONE})];
  assert.deepEqual(returnCandidates(wishes).map(item => item.id), ['1']);
});

test('帰還すると判断待ちになる', () => {
  const returned = markReturned(wish(), at(2026, 10, 1));
  assert.equal(returned.status, STATUS.RETURNED);
  assert.equal(returned.updatedAt, at(2026, 10, 1));
});

test('軌道上にない願いは帰還させない', () => {
  assert.throws(() => markReturned(wish({status: STATUS.DONE}), at(2026, 10, 1)));
});

test('3つの選択肢はそれぞれの状態へ移る', () => {
  const returned = wish({status: STATUS.RETURNED});
  assert.equal(decide(returned, 'try', 1).status, STATUS.DOING);
  assert.equal(decide(returned, 'later', 1).status, STATUS.WAITING);
  assert.equal(decide(returned, 'finish', 1).status, STATUS.DONE);
  assert.deepEqual(Object.keys(CHOICES), ['try', 'later', 'finish']);
});

test('「戻す」を選んだ願いは、また帰還の候補になる', () => {
  const backToOrbit = decide(wish({status: STATUS.RETURNED}), 'later', at(2026, 10, 2));
  assert.deepEqual(returnCandidates([backToOrbit]).map(item => item.id), ['a']);
});

test('判断待ちでない願いや不明な選択肢は受け付けない', () => {
  assert.throws(() => decide(wish(), 'try', 1));
  assert.throws(() => decide(wish({status: STATUS.RETURNED}), 'unknown', 1));
});

test('判断せずに閉じた願いは、再開のために取り出せる（行き止まりにしない）', () => {
  const older = wish({id: 'old', status: STATUS.RETURNED, updatedAt: at(2026, 9, 30)});
  const newer = wish({id: 'new', status: STATUS.RETURNED, updatedAt: at(2026, 10, 1)});
  assert.equal(pendingReturn([wish({id: 'orbit'}), older, newer]).id, 'new');
  assert.equal(pendingReturn([wish()]), null);
});

test('待っていた日数は時刻ではなく日付で数える', () => {
  const deposited = wish({createdAt: at(2026, 9, 22, 23)});
  assert.equal(daysWaited(deposited, at(2026, 9, 22, 23, 30)), 0);
  assert.equal(daysWaited(deposited, at(2026, 9, 23, 0)), 1);
  assert.equal(daysWaited(deposited, at(2026, 10, 29)), 37);
});

test('待っていた日数の文言', () => {
  assert.equal(waitedMessage(0), '今日、預けた願いです。');
  assert.equal(waitedMessage(37), '37日間、イトカワの軌道であなたを待っていました。');
});
