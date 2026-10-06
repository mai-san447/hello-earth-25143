// 応援の信号の数え方（届いた数・星の明るさ・帰還カードの文）。
// 画面を持たない純粋な関数だけを置き、テストで確かめる。
// 受け取った願いの星座（言葉の近さでつなぐ最小全域木）は、2026-10-07 にやめた（見栄えがよくなく、星だけでは意味が伝わらないため）。
// ファイル名は読み込みの互換のため constellation.js のまま。

// 応援の信号：願いが軌道で待っていたあいだに届いた数。
// 軌道にいる願いは今まで、帰ってきた願いは判断した時点まで（updatedAt）を数える。
export function signalsWhileWaiting(wish, signalTimes, now = Date.now()) {
  if (!Array.isArray(signalTimes) || !signalTimes.length) return 0;
  const until = wish.status === 'waiting' ? now : wish.updatedAt;
  let count = 0;
  for (const time of signalTimes) if (time >= wish.createdAt && time <= until) count++;
  return count;
}

// 星の明るさ（1〜2.2倍）。信号が届くほど明るくなるが、数が多くても眩しくなりすぎないよう対数で抑える。
export function brightness(signalCount) {
  return Math.min(2.2, 1 + Math.log2(1 + Math.max(0, signalCount)) * 0.25);
}

export function signalMessage(count) {
  return count > 0 ? `預けているあいだに、${count}回の信号が届いていました。` : '';
}
