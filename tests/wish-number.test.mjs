import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createWish, nextWishSeq, wishNumber, wishSeqOf} from '../public/wish-state.js';

const wish = (id, createdAt, seq) => ({id, text: id, status: 'waiting', createdAt, updatedAt: createdAt, ...(seq ? {seq} : {})});

test('願いの番号は 1 から順に。消した番号は使い回さない', () => {
  assert.equal(nextWishSeq([], 0), 1);
  assert.equal(nextWishSeq([wish('a', 1, 1), wish('b', 2, 2)], 2), 3);
  // 3 番を消したあと（端末には 3 まで出したと覚えている）
  assert.equal(nextWishSeq([wish('a', 1, 1), wish('b', 2, 2)], 3), 4);
});

test('預けた願いは番号を持つ', () => {
  assert.equal(createWish({id: 'a', text: '海へ', now: 10, seq: 4}).seq, 4);
  assert.equal('seq' in createWish({id: 'a', text: '海へ', now: 10}), false);
});

test('番号を持たない前からの願いは、預けた順に数える', () => {
  const wishes = [wish('b', 20), wish('a', 10), wish('c', 30, 5)];
  assert.equal(wishSeqOf(wishes[1], wishes), 1);
  assert.equal(wishSeqOf(wishes[0], wishes), 2);
  assert.equal(wishSeqOf(wishes[2], wishes), 5);
});

test('25143-人-願い の形にする。人の番号がまだなければ出さない', () => {
  assert.equal(wishNumber('25143-0007', 3), '25143-0007-03');
  assert.equal(wishNumber('25143-0000', 12), '25143-0000-12');
  assert.equal(wishNumber('25143-0007', 120), '25143-0007-120');
  assert.equal(wishNumber(null, 3), null);
  assert.equal(wishNumber('25143-0007', 0), null);
});
