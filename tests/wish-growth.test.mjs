import assert from 'node:assert/strict';
import {test} from 'node:test';
import {GROWTH, STATUS, ART_MAX_LENGTH, setArt, canStep, growthLabel, growthMessage, magnitude, markFulfilled, recordStep, setFirstStep} from '../public/wish-state.js';

const day = (date, hour = 10) => new Date(2026, 9, date, hour).getTime();
const received = (extra = {}) => ({id: 'a', text: '海の近くに住む', status: STATUS.DOING, createdAt: day(1), updatedAt: day(3), ...extra});

test('受け取ったばかりの願いは6等星', () => {
  assert.equal(magnitude(received()), GROWTH.faintest);
  assert.equal(growthLabel(received()), '6等星');
});

test('受け取っていない願いは育たない（等級を持たない）', () => {
  for (const status of [STATUS.WAITING, STATUS.RETURNED, STATUS.DONE]) {
    assert.equal(magnitude({...received(), status}), null);
    assert.equal(canStep({...received(), status}, day(5)), false);
    assert.throws(() => recordStep({...received(), status}, day(5)));
  }
});

test('一歩ごとに1等級ずつ明るくなり、1等星で止まる', () => {
  let wish = received();
  for (let date = 5; date <= 12; date++) wish = recordStep(wish, day(date));
  assert.equal(wish.steps.length, 8);
  assert.equal(magnitude(wish), GROWTH.brightest);
  assert.equal(magnitude(recordStep(received(), day(5))), 5);
});

test('一歩は1日1回まで数える', () => {
  const wish = recordStep(received(), day(5, 9));
  assert.equal(canStep(wish, day(5, 21)), false);
  assert.throws(() => recordStep(wish, day(5, 21)));
  assert.equal(canStep(wish, day(6, 9)), true);
});

test('一歩を記録しても、判断した日（updatedAt）は変えない', () => {
  assert.equal(recordStep(received(), day(5)).updatedAt, day(3));
});

test('何もしなくても暗くならない', () => {
  const wish = recordStep(received(), day(5));
  assert.equal(magnitude(wish), 5);
  assert.equal(magnitude({...wish}), 5);
});

test('叶った願いは1等星になり、それ以上は一歩を数えない', () => {
  const wish = markFulfilled(received(), day(9));
  assert.equal(magnitude(wish), GROWTH.brightest);
  assert.equal(growthLabel(wish), '叶った星');
  assert.equal(canStep(wish, day(10)), false);
  assert.equal(markFulfilled(wish, day(11)).fulfilledAt, day(9));
});

test('最初の一歩が変わらないときは、同じ願いを返す（保存を重ねない）', () => {
  const written = setFirstStep(received(), '地図で町を3つ選ぶ');
  assert.equal(setFirstStep(written, ' 地図で町を3つ選ぶ '), written);
  const empty = received();
  assert.equal(setFirstStep(empty, ''), empty);
});

test('最初の一歩は書かなくてもよく、空にすれば消える', () => {
  const written = setFirstStep(received(), '  地図で町を3つ選ぶ  ');
  assert.equal(written.firstStep, '地図で町を3つ選ぶ');
  assert.equal('firstStep' in setFirstStep(written, ''), false);
  assert.throws(() => setFirstStep(received(), 'あ'.repeat(GROWTH.firstStepMax + 1)));
});

test('育ち方の文言', () => {
  assert.match(growthMessage(received()), /かすかな星/);
  assert.equal(growthMessage(recordStep(received(), day(5))), '1歩ふみ出して、5等星になりました。');
  assert.equal(growthMessage({...received()}), growthMessage(received()));
});

test('日付が変わったら、次の一歩を記録できる（23:59 と 0:00）', () => {
  const wish = recordStep(received(), new Date(2026, 9, 5, 23, 59).getTime());
  assert.equal(canStep(wish, new Date(2026, 9, 5, 23, 59, 59).getTime()), false);
  assert.equal(canStep(wish, new Date(2026, 9, 6, 0, 0).getTime()), true);
});

test('最初の一歩の文字数は、絵文字も1字として数える', () => {
  const emoji = '🌊'.repeat(GROWTH.firstStepMax);
  assert.equal(setFirstStep(received(), emoji).firstStep, emoji);
  assert.throws(() => setFirstStep(received(), emoji + '🌊'));
});

test('願いの絵は、白黒の PNG だけを保存する', () => {
  const png = 'data:image/png;base64,iVBORw0KGgo=';
  assert.equal(setArt(received(), png).art, png);
  assert.throws(() => setArt(received(), 'data:image/jpeg;base64,abc'));
  assert.throws(() => setArt(received(), 'data:image/png;base64,' + 'a'.repeat(ART_MAX_LENGTH)));
});
