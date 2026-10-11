import test from 'node:test';
import assert from 'node:assert/strict';

// docs/同時利用と例外の設計.md の「数の決まり」を、ランダムなシミュレーションで確かめる。
// 乱数は種を決めて、毎回同じ結果になるようにする（テストが揺れないように）。
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// V 個の中から K 個を、同じ確率で選ぶ（サーバーの ORDER BY random() LIMIT K と同じ考え方）
function sample(V, K, random) {
  const pool = Array.from({length: V}, (_, i) => i);
  for (let i = 0; i < K; i += 1) {
    const j = i + Math.floor(random() * (V - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, K);
}

const expectedDistinct = (V, K, n) => V * (1 - (1 - K / V) ** n);

test('2-2：ある星が1回で見える確率は K/V（どの星も同じ）', () => {
  const random = rng(1);
  const V = 150, K = 24, loads = 20000;
  const seen = new Array(V).fill(0);
  for (let n = 0; n < loads; n += 1) for (const i of sample(V, K, random)) seen[i] += 1;
  const p = K / V;
  for (const count of seen) assert.ok(Math.abs(count / loads - p) < 0.02, `${count / loads} は ${p} に近いはず`);
});

test('2-4：n 回開いて出会う星の数は V(1-(1-K/V)^n)。実測（V=150, K=24, n=10 → 126）とも合う', () => {
  const random = rng(2);
  const V = 150, K = 24, n = 10, trials = 2000;
  let total = 0;
  for (let t = 0; t < trials; t += 1) {
    const met = new Set();
    for (let k = 0; k < n; k += 1) for (const i of sample(V, K, random)) met.add(i);
    total += met.size;
  }
  const mean = total / trials;
  assert.ok(Math.abs(mean - expectedDistinct(V, K, n)) < 1.5);
  assert.ok(Math.abs(expectedDistinct(V, K, n) - 126) < 4);
});

test('2-5：自分の願いが浮かぶ確率は w·m/(w·m+o)（自分6個・他の人24個・重み2 → 1/3）', () => {
  const random = rng(3);
  const m = 6, o = 24, w = 2, draws = 30000;
  let own = 0;
  for (let i = 0; i < draws; i += 1) if (random() * (w * m + o) < w * m) own += 1;
  assert.ok(Math.abs(own / draws - (w * m) / (w * m + o)) < 0.01);
});

test('2-1：星空の星の数は λ×T（1日40件・平均60日 → 約2,400）', () => {
  const random = rng(4);
  const lambda = 40, meanDays = 60, days = 600;
  const alive = [];
  for (let day = 0; day < days; day += 1) {
    for (let i = 0; i < lambda; i += 1) alive.push(day + -Math.log(1 - random()) * meanDays);
    for (let i = alive.length - 1; i >= 0; i -= 1) if (alive[i] <= day) alive.splice(i, 1);
  }
  assert.ok(Math.abs(alive.length - lambda * meanDays) / (lambda * meanDays) < 0.1);
});
