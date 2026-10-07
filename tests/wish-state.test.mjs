import assert from 'node:assert/strict';
import {test} from 'node:test';
import {CHOICES, LIMITS, STATUS, candidatesWithTrial, canDeposit, checkReturnFrom, createWish, daysWaited, decide, gentleMessage, markReturned, nextReturnFrom, orbitingWishes, parseReturnFrom, pendingReturn, returnCandidates, returnFromLabel, returnFromRange, summarize, trialAvailable, waitedMessage} from '../public/wish-state.js';

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
  assert.equal(waitedMessage(37), '37日間、あなたを待っていました。');
});

// #7 帰還が始まる日
const discharge = at(2026, 10, 25, 0);

test('帰還が始まる日の前は、軌道を回っていても帰還の候補にしない', () => {
  const later = wish({id: 'later', returnFrom: discharge});
  const now = wish({id: 'now'});
  assert.deepEqual(orbitingWishes([later, now]).map(item => item.id), ['later', 'now']);
  assert.deepEqual(returnCandidates([later, now], at(2026, 10, 1)).map(item => item.id), ['now']);
});

test('帰還が始まる日の当日 0:00 から候補になる', () => {
  const later = wish({returnFrom: discharge});
  assert.deepEqual(returnCandidates([later], discharge - 1), []);
  assert.deepEqual(returnCandidates([later], discharge).map(item => item.id), ['a']);
});

test('候補がないときは、いちばん早い開始日を知らせる', () => {
  const wishes = [wish({id: '1', returnFrom: at(2026, 11, 3, 0)}), wish({id: '2', returnFrom: discharge}), wish({id: '3', status: STATUS.DONE, returnFrom: at(2026, 10, 20, 0)})];
  assert.equal(nextReturnFrom(wishes, at(2026, 10, 1)), discharge);
  assert.equal(nextReturnFrom([wish()], at(2026, 10, 1)), null);
  assert.equal(returnFromLabel(discharge), '10月25日');
});

test('預けるとき、今日より後の日付だけを帰還が始まる日として持たせる', () => {
  const now = at(2026, 10, 1);
  assert.equal(createWish({id: 'x', text: '海', now, returnFrom: discharge}).returnFrom, discharge);
  assert.equal('returnFrom' in createWish({id: 'x', text: '海', now}), false);
  assert.equal('returnFrom' in createWish({id: 'x', text: '海', now, returnFrom: at(2026, 9, 1, 0)}), false);
  assert.equal(createWish({id: 'x', text: '海', now}).status, STATUS.WAITING);
});

test('日付の入力を端末の 0:00 に直す。空や存在しない日付は null', () => {
  assert.equal(parseReturnFrom('2026-10-25'), discharge);
  assert.equal(parseReturnFrom(''), null);
  assert.equal(parseReturnFrom('2026-02-30'), null);
  assert.equal(parseReturnFrom('10/25'), null);
});

test('「星空へ戻す」を選んでも、帰還が始まる日はそのまま残る', () => {
  const back = decide(wish({status: STATUS.RETURNED, returnFrom: discharge}), 'later', at(2026, 10, 26));
  assert.equal(back.returnFrom, discharge);
  assert.deepEqual(returnCandidates([back], at(2026, 10, 26)).map(item => item.id), ['a']);
});

// #17 登録できる数とルール
test('軌道に置ける願いは30件まで。受け取った願いは数えない', () => {
  const orbit = Array.from({length: LIMITS.orbit}, (_, index) => wish({id: `o${index}`}));
  assert.equal(canDeposit(orbit.slice(0, LIMITS.orbit - 1)), true);
  assert.equal(canDeposit(orbit), false);
  assert.equal(canDeposit([...orbit.slice(0, LIMITS.orbit - 1), wish({id: 'r', status: STATUS.DONE})]), true);
});

test('帰還が始まる日は翌日から1年後まで。空欄はすぐ帰還の候補', () => {
  const now = at(2026, 10, 1, 15);
  assert.deepEqual(checkReturnFrom('', now), {ok: true, time: null});
  assert.equal(checkReturnFrom('2026-10-01', now).ok, false);
  assert.equal(checkReturnFrom('2026-10-02', now).time, at(2026, 10, 2, 0));
  assert.equal(checkReturnFrom('2027-10-01', now).ok, true);
  assert.equal(checkReturnFrom('2027-10-02', now).ok, false);
  assert.equal(checkReturnFrom('2026-02-30', now).ok, false);
  assert.deepEqual(returnFromRange(now), {min: '2026-10-02', max: '2027-10-01'});
});

test('星空へ戻した回数を数え、5回目に一度だけやさしい一言を出す', () => {
  let current = wish({status: STATUS.RETURNED});
  const messages = [];
  for (let count = 1; count <= 6; count++) {
    current = decide(current, 'later', count);
    messages.push(gentleMessage(current));
    current = {...current, status: STATUS.RETURNED};
  }
  assert.equal(current.laterCount, 6);
  assert.deepEqual(messages.map(Boolean), [false, false, false, false, true, false]);
  assert.equal('laterCount' in decide(wish({status: STATUS.RETURNED}), 'try', 1), false);
});


// 検証・評価のための数
test('検証の数は、願いの中身を使わず状態と回数だけから出す', () => {
  const wishes = [
    wish({id: '1'}),
    wish({id: '2', returnFrom: at(2026, 10, 25, 0)}),
    wish({id: '3', status: STATUS.RETURNED}),
    wish({id: '4', status: STATUS.DOING, laterCount: 2}),
    wish({id: '5', status: STATUS.DOING}),
    wish({id: '6', status: STATUS.DONE, laterCount: 1}),
  ];
  const summary = summarize(wishes, ['2026-10-01', '2026-10-03', '2026-10-03', '2026-10-09'], at(2026, 10, 9));
  assert.deepEqual(summary, {
    deposited: 6, orbiting: 2, pending: 1, received: 2, archived: 1, receiveRate: 67,
    backToOrbit: 3, withReturnFrom: 1, openDays: 3, activeDaysLast7: 2, cameBackAfter7Days: true,
  });
  assert.equal(JSON.stringify(summary).includes('朝の海'), false);
});

test('まだ何も決めていないときの受け取り率は null', () => {
  const summary = summarize([wish()], [], at(2026, 10, 1));
  assert.equal(summary.receiveRate, null);
  assert.equal(summary.cameBackAfter7Days, false);
});

test('#27 はじめての1回：一度も帰ってきたことがなければ、帰還が始まる日の前でも1回だけ帰せる', () => {
  const now = at(2026, 9, 30);
  const future = [wish({id: '1', returnFrom: at(2026, 10, 20, 0)})];
  assert.equal(trialAvailable(future, false), true);
  assert.deepEqual(candidatesWithTrial(future, now, false).map(item => item.id), ['1']);
  // 使ったあとは、ふつうのきまり（帰還が始まる日まで帰らない）に戻る
  assert.deepEqual(candidatesWithTrial(future, now, true), []);
});

test('#27 はじめての1回：一度でも帰ってきた人や、軌道が空の人には出さない', () => {
  const now = at(2026, 9, 30);
  const returnedBefore = [wish({id: '1', returnFrom: at(2026, 10, 20, 0)}), wish({id: '2', status: STATUS.DONE})];
  assert.equal(trialAvailable(returnedBefore, false), false);
  assert.deepEqual(candidatesWithTrial(returnedBefore, now, false), []);
  assert.equal(trialAvailable([], false), false);
});

test('#27 ふつうの候補があれば、そちらだけを出す', () => {
  const now = at(2026, 9, 30);
  const wishes = [wish({id: '1'}), wish({id: '2', returnFrom: at(2026, 10, 20, 0)})];
  assert.deepEqual(candidatesWithTrial(wishes, now, false).map(item => item.id), ['1']);
});
