// 受け取った願いの星座と、応援の信号の数え方。
// 画面を持たない純粋な関数だけを置き、テストで確かめる。
//
// 星座：帰ってきて受け取った願いどうしを、言葉の近さで線につなぐ。
// 全体が1つにつながり、線の合計が最も短くなるつなぎ方（最小全域木）を Prim 法で求める。
// 10/7 版は、病室でもネットなしで動くよう、意味ではなく文字の重なり（2文字ずつ）で近さを測る。
// （着想：同じハッカソンの「ブクスペ」がブックマークの星を Prim 法でつないでいた）

const RECEIVED = new Set(['doing', 'done']);

export function receivedWishes(wishes) {
  return wishes.filter(wish => RECEIVED.has(wish.status)).sort((a, b) => a.createdAt - b.createdAt);
}

// 2文字ずつの組の集合。空白と記号は無視する。1文字だけの願いはその1文字を使う。
export function bigrams(text) {
  const chars = [...String(text).normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '')];
  if (chars.length < 2) return new Set(chars);
  const grams = new Set();
  for (let index = 0; index < chars.length - 1; index++) grams.add(chars[index] + chars[index + 1]);
  return grams;
}

// 0（まったく違う）〜1（同じ）の近さ。Jaccard 係数。
export function similarity(a, b) {
  const left = bigrams(a);
  const right = bigrams(b);
  if (!left.size && !right.size) return 0;
  let shared = 0;
  for (const gram of left) if (right.has(gram)) shared++;
  return shared / (left.size + right.size - shared);
}

// Prim 法で最小全域木の辺を返す。辺の長さは 1 - 近さ。
// 長さが同じときは古い願いを優先し、同じ入力なら必ず同じ星座になるようにする。
export function constellationEdges(wishes) {
  const stars = receivedWishes(wishes);
  if (stars.length < 2) return [];
  const inTree = new Set([0]);
  const edges = [];
  while (inTree.size < stars.length) {
    let best = null;
    for (const from of inTree) {
      for (let to = 0; to < stars.length; to++) {
        if (inTree.has(to)) continue;
        const weight = 1 - similarity(stars[from].text, stars[to].text);
        if (!best || weight < best.weight - 1e-12 || (Math.abs(weight - best.weight) < 1e-12 && (to < best.to || (to === best.to && from < best.from)))) {
          best = {from, to, weight};
        }
      }
    }
    inTree.add(best.to);
    edges.push({from: stars[best.from].id, to: stars[best.to].id, closeness: 1 - best.weight});
  }
  return edges;
}

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
