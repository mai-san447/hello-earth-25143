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

// #17 登録できる数とルール（講師の質問から、使う人と場面を想定して決めた）
export const LIMITS = Object.freeze({
  // 軌道に置ける願い。1日1つ帰すと約1か月分＝入院（一般病床の平均在院日数は約16日）と回復期に見合う。
  // 多すぎると「やりたいことリストが重荷になる」という出発点の課題に戻る
  orbit: 30,
  // 帰還が始まる日は、翌日から1年後まで。打ち間違いを防ぎ、端末の保存が消えるリスクも抑える
  returnFromMaxDays: 365,
  // 軌道へ戻した回数がこの回数になったら、一度だけ「手放してもいい」と伝える。戻すこと自体は止めない
  gentleLaterCount: 5,
});

export function canDeposit(wishes) {
  return orbitingWishes(wishes).length < LIMITS.orbit;
}

// 帰還が始まる日の入力を確かめる。空欄は「すぐ帰還の候補」でよい
export function checkReturnFrom(value, now) {
  if (!value) return {ok: true, time: null};
  const time = parseReturnFrom(value);
  if (time == null) return {ok: false, error: '帰還が始まる日を確かめてください。'};
  const tomorrow = new Date(now);
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (time < tomorrow.getTime()) return {ok: false, error: '帰還が始まる日は、明日以降にしてください。'};
  const latest = new Date(tomorrow);
  latest.setDate(latest.getDate() - 1 + LIMITS.returnFromMaxDays);
  if (time > latest.getTime()) return {ok: false, error: '帰還が始まる日は、1年後までにしてください。'};
  return {ok: true, time};
}

// 日付欄の min / max に入れる値（YYYY-MM-DD、端末の暦）
export function returnFromRange(now) {
  const format = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const min = new Date(now);
  min.setDate(min.getDate() + 1);
  const max = new Date(now);
  max.setDate(max.getDate() + LIMITS.returnFromMaxDays);
  return {min: format(min), max: format(max)};
}

// 検証・評価（docs/検証計画.md）のための数。願いの中身は使わず、端末の中の記録から数だけを出す。
// openDays は、この端末でアプリを開いた日（YYYY-MM-DD）の一覧。
export function summarize(wishes, openDays = [], now = Date.now()) {
  const count = status => wishes.filter(wish => wish.status === status).length;
  const received = count(STATUS.DOING);
  const archived = count(STATUS.DONE);
  const days = [...new Set(openDays)].sort();
  const dayNumber = day => {
    const [year, month, date] = day.split('-').map(Number);
    return Math.round(new Date(year, month - 1, date).getTime() / DAY_MS);
  };
  const today = dayNumber(new Date(now).toLocaleDateString('sv-SE'));
  const firstDay = days.length ? dayNumber(days[0]) : null;
  return {
    deposited: wishes.length,
    orbiting: count(STATUS.WAITING),
    pending: count(STATUS.RETURNED),
    received,
    archived,
    // 受け取り率：帰ってきて決めた願いのうち「想いを受け取る」を選んだ割合（決めた願いがなければ null）
    receiveRate: received + archived ? Math.round((received / (received + archived)) * 100) : null,
    backToOrbit: wishes.reduce((sum, wish) => sum + (wish.laterCount ?? 0), 0),
    withReturnFrom: wishes.filter(wish => Number.isFinite(wish.returnFrom)).length,
    openDays: days.length,
    activeDaysLast7: days.filter(day => today - dayNumber(day) < 7).length,
    // 初めて開いた日から7日以上たってから、もう一度開いたか
    cameBackAfter7Days: firstDay != null && days.some(day => dayNumber(day) - firstDay >= 7),
  };
}

export function gentleMessage(wish) {
  return wish.laterCount === LIMITS.gentleLaterCount
    ? `この願いを${LIMITS.gentleLaterCount}回、軌道へ戻しました。いつでも戻せますし、手放しても大丈夫です。`
    : '';
}

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
  const decided = {...wish, status, updatedAt: now};
  // 軌道へ戻した回数を数える（#17：5回目に一度だけ、やさしい一言を出すため）
  if (choice === 'later') decided.laterCount = (wish.laterCount ?? 0) + 1;
  return decided;
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
