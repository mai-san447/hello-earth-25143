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

export function returnCandidates(wishes) {
  return wishes.filter(wish => wish.status === STATUS.WAITING);
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
