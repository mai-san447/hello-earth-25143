// 願い1件の状態遷移をここに集める。画面や保存の処理を持たない純粋な関数だけを置き、
// node --test で確かめられるようにする（設計図：docs/状態設計.md）。

export const STATUS = Object.freeze({
  WAITING: 'waiting',   // イトカワの軌道を周回中。帰還の候補になる
  RETURNED: 'returned', // 地球に着地し、判断を待っている
  DOING: 'doing',       // やってみる
  DONE: 'done',         // 終えた
});

// 帰還カードの3つの選択肢。「戻す」は責めずに軌道へ戻すための選択肢。
export const CHOICES = Object.freeze({
  try: STATUS.DOING,
  later: STATUS.WAITING,
  finish: STATUS.DONE,
});

const DAY_MS = 24 * 60 * 60 * 1000;

// 軌道を回っている願い（画面に星として描くもの）。帰還が始まる日の前でも描く。
export function orbitingWishes(wishes) {
  return wishes.filter(wish => wish.status === STATUS.WAITING);
}

// 帰還の候補。#7：帰還が始まる日（returnFrom）が決まっている願いは、その日になるまで帰らない。
export function returnCandidates(wishes, now = Date.now()) {
  return orbitingWishes(wishes).filter(wish => !Number.isFinite(wish.returnFrom) || wish.returnFrom <= now);
}

// まだ帰還の候補がないとき、いちばん早く帰還が始まる日。なければ null。
export function nextReturnFrom(wishes, now = Date.now()) {
  const upcoming = orbitingWishes(wishes)
    .map(wish => wish.returnFrom)
    .filter(time => Number.isFinite(time) && time > now);
  return upcoming.length ? Math.min(...upcoming) : null;
}

export function createWish({id, text, now, returnFrom = null}) {
  const wish = {id, text, status: STATUS.WAITING, createdAt: now, updatedAt: now};
  // 今日より後の日付のときだけ持たせる。空欄や過去の日付は「すぐ帰還の候補」
  if (Number.isFinite(returnFrom) && returnFrom > now) wish.returnFrom = returnFrom;
  return wish;
}

// 日付入力（YYYY-MM-DD）を、その日の端末の 0:00 にする。空や不正な値は null。
export function parseReturnFrom(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date.getTime();
}

export function returnFromLabel(time) {
  const date = new Date(time);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

// 判断せずに閉じた願い。以前はこの状態から抜けられない行き止まりだったため、
// 次に開いたときに最初に差し出して判断を再開する。
export function pendingReturn(wishes) {
  return wishes
    .filter(wish => wish.status === STATUS.RETURNED)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
}

export function markReturned(wish, now) {
  if (wish.status !== STATUS.WAITING) throw new Error(`軌道上にない願いは帰還できません: ${wish.status}`);
  return {...wish, status: STATUS.RETURNED, updatedAt: now};
}

export function decide(wish, choice, now) {
  if (wish.status !== STATUS.RETURNED) throw new Error(`判断待ちではない願いです: ${wish.status}`);
  const status = CHOICES[choice];
  if (!status) throw new Error(`不明な選択肢です: ${choice}`);
  return {...wish, status, updatedAt: now};
}

function startOfLocalDay(time) {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

// 預けた日から今日まで、暦の日付で何日たったか。時刻ではなく日付で数える。
export function daysWaited(wish, now) {
  return Math.max(0, Math.round((startOfLocalDay(now) - startOfLocalDay(wish.createdAt)) / DAY_MS));
}

export function waitedMessage(days) {
  return days === 0 ? '今日、預けた願いです。' : `${days}日間、イトカワの軌道であなたを待っていました。`;
}
