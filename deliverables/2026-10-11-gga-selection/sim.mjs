// MORUNE 25143 の星の並び・席・ガチャのシミュレーション。アプリの計算コードをそのまま読み込む。
// 使い方: node sim.mjs <リポジトリのパス> > result.json
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
const repo = process.argv[2];
const load = p => import(pathToFileURL(`${repo}/${p}`).href);
const Sky = await load('public/sky.js');
const W = await load('public/wish-state.js');
const P = await load('public/public-stars.js');

// 再現できる乱数（xorshift）
let s = 25143;
const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e9) / 1e9; };

const RAD = Math.PI / 180;
const screens = {phone: [390, 844], pc: [1440, 900]};
const seats = Sky.NORTH_CONSTELLATIONS.flatMap(g => g.stars.map(star => ({group: g.id, ...star})));
const t0 = Date.UTC(2026, 9, 14, 10); // 10/14 19:00 JST
const TOKYO = [35.68, 139.76];

// 1. 19の席の星：本当の角距離と、画面の距離（投影は回転するだけなので、時刻によらない）
function angular(a, b) {
  const c = Math.sin(a.decDeg * RAD) * Math.sin(b.decDeg * RAD) + Math.cos(a.decDeg * RAD) * Math.cos(b.decDeg * RAD) * Math.cos((a.raDeg - b.raDeg) * RAD);
  return Math.acos(Math.min(1, Math.max(-1, c))) / RAD;
}
const geometry = {};
for (const [name, [w, h]] of Object.entries(screens)) {
  const pts = seats.map(st => Sky.projectPolarStar(st.raDeg, st.decDeg, t0, ...TOKYO, w, h));
  let min = Infinity, pair = null; const near = [];
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
    if (d < min) { min = d; pair = [seats[i].name, seats[j].name]; }
    if (d < 48) near.push({a: seats[i].name, b: seats[j].name, px: +d.toFixed(1), deg: +angular(seats[i], seats[j]).toFixed(2)});
  }
  const cx = w / 2, cy = h / 2;
  const maxR = Math.max(...pts.map(p => Math.hypot(p.x - cx, p.y - cy)));
  geometry[name] = {w, h, pxPerDeg: +(Math.min(w, h) * .45 / 50).toFixed(2), minPx: +min.toFixed(1), minPair: pair, under48: near.sort((a, b) => a.px - b.px), maxRadiusPx: +maxR.toFixed(0), maxRadiusShare: +(maxR / Math.min(w, h)).toFixed(3)};
}
const seatTable = seats.map((st, i) => ({seat: i + 1, name: st.name, group: st.group, decDeg: st.decDeg,
  altitudeTokyoMin: +(st.decDeg - (90 - TOKYO[0])).toFixed(1)})); // 下の南中の高度＝赤緯−余緯度。負なら1日のうち沈む時間がある

// 2. 沈む時間：東京で、各席の星が1日のうち地平線の下にいる割合
const below = seats.map(st => {
  let n = 0; const steps = 288;
  for (let k = 0; k < steps; k++) if (Sky.projectPolarStar(st.raDeg, st.decDeg, t0 + k * 300000, ...TOKYO, 390, 844).altitude < 0) n++;
  return {name: st.name, belowShare: +(n / steps).toFixed(3)};
});

// 3. 他の人の星（ランダムな点）が、自分の星に指の幅（24px）以内で重なる確率（スマホ）
function othersOverlap(K, trials = 4000) {
  const [w, h] = screens.phone;
  const own = seats.map(st => Sky.projectPolarStar(st.raDeg, st.decDeg, t0, ...TOKYO, w, h));
  let anyNear = 0, nearCount = 0;
  for (let t = 0; t < trials; t++) {
    let hit = 0;
    for (let k = 0; k < K; k++) {
      const sd = P.starSeed(randomUUID());
      const p = Sky.projectPolarStar(sd.raDeg, sd.decDeg, t0, ...TOKYO, w, h);
      if (own.some(o => Math.hypot(o.x - p.x, o.y - p.y) <= 24)) hit++;
    }
    nearCount += hit; if (hit) anyNear++;
  }
  return {K, pAnyOtherNearOwn: +(anyNear / trials).toFixed(3), meanNear: +(nearCount / trials).toFixed(2)};
}
const others = [6, 24].map(K => othersOverlap(K));

// 4. 1年の暮らしのシミュレーション：預ける・帰す・受け取る／もう少し預ける・消す
//    旧＝番号で星を決める（上限30、受け取った星も空に残る）／新＝席（上限19、受け取ると空から消える）
function life(mode, profile, days = 365) {
  const limit = mode === 'old' ? 30 : 19;
  let wishes = [], seq = 0, lastId = null;
  let overlapDays = 0, maxSky = 0, maxOverlapPairs = 0, sameInRow = 0, returns = 0, blocked = 0;
  for (let d = 0; d < days; d++) {
    // 預ける
    for (let k = 0; k < profile.depositPerDay(d); k++) {
      const holders = wishes.filter(x => x.status === 'waiting' || x.status === 'returned').length;
      if (holders >= limit) { blocked++; continue; }
      seq++;
      wishes.push({id: `w${seq}`, seq, status: 'waiting', createdAt: d, updatedAt: d, seat: mode === 'new' ? W.nextSeat(wishes) : undefined});
    }
    // 消す（預けている願いを消す）
    if (rnd() < profile.deletePerDay) {
      const pool = wishes.filter(x => x.status === 'waiting');
      if (pool.length) { const v = pool[Math.floor(rnd() * pool.length)]; wishes = wishes.filter(x => x.id !== v.id); }
    }
    // 帰す
    if (rnd() < profile.returnPerDay) {
      const cand = wishes.filter(x => x.status === 'waiting');
      if (cand.length) {
        const pick = mode === 'old' ? cand[Math.floor(rnd() * cand.length)] : W.pickReturn(cand, lastId, rnd());
        if (pick.id === lastId) sameInRow++;
        lastId = pick.id; returns++;
        pick.status = rnd() < profile.receive ? 'doing' : 'waiting';
      }
    }
    // 空の星：位置が同じ星の組を数える
    const sky = mode === 'old' ? wishes.filter(x => x.status === 'waiting' || x.status === 'doing') : wishes.filter(x => x.status === 'waiting');
    const keys = sky.map(x => {
      const slot = mode === 'old' ? Sky.northStarForSeq(x.seq) : Sky.northStarForSeq(W.seatOf(x, wishes) + 1);
      return `${slot.constellation.id}:${slot.starIndex}`;
    });
    const counts = {}; keys.forEach(k => { counts[k] = (counts[k] ?? 0) + 1; });
    const pairs = Object.values(counts).reduce((a, n) => a + n * (n - 1) / 2, 0);
    if (pairs) overlapDays++;
    maxSky = Math.max(maxSky, sky.length); maxOverlapPairs = Math.max(maxOverlapPairs, pairs);
  }
  return {overlapDays, maxSky, maxOverlapPairs, sameInRowShare: returns ? +(sameInRow / returns).toFixed(3) : 0, blocked};
}
const profiles = {
  '休職前にまとめて預ける人': {depositPerDay: d => (d < 3 ? 8 : rnd() < .1 ? 1 : 0), deletePerDay: .02, returnPerDay: .5, receive: .5},
  '毎日すこしずつ使う人': {depositPerDay: () => (rnd() < .4 ? 1 : 0), deletePerDay: .03, returnPerDay: .6, receive: .6},
  'たくさん預けて、あまり帰さない人': {depositPerDay: () => (rnd() < .7 ? 1 : 0), deletePerDay: .05, returnPerDay: .2, receive: .4},
};
const lifeResults = {};
for (const [name, prof] of Object.entries(profiles)) {
  const runs = 300; const acc = {old: [], new: []};
  for (const mode of ['old', 'new']) for (let r = 0; r < runs; r++) acc[mode].push(life(mode, prof));
  const mean = (arr, k) => +(arr.reduce((a, x) => a + x[k], 0) / arr.length).toFixed(2);
  const share = (arr, k) => +(arr.filter(x => x[k] > 0).length / arr.length).toFixed(3);
  lifeResults[name] = Object.fromEntries(['old', 'new'].map(m => [m, {
    overlapDaysMean: mean(acc[m], 'overlapDays'), usersWithOverlap: share(acc[m], 'overlapDays'),
    maxSkyMean: mean(acc[m], 'maxSky'), sameInRowShare: mean(acc[m], 'sameInRowShare'), blockedMean: mean(acc[m], 'blocked')}]));
}

// 5. ガチャ：N 個の候補で「もう少し預ける」を続けたとき、同じ願いが続く確率と、全部に一度会うまでの回数
function gacha(N, mode, trials = 20000) {
  let same = 0, draws = 0, toAll = 0;
  for (let t = 0; t < trials; t++) {
    const cand = Array.from({length: N}, (_, i) => ({id: i}));
    let last = null; const seen = new Set(); let n = 0;
    while (seen.size < N && n < 1000) {
      const pick = mode === 'old' ? cand[Math.floor(rnd() * N)] : W.pickReturn(cand, last, rnd());
      if (pick.id === last) same++;
      draws++; n++; last = pick.id; seen.add(pick.id);
    }
    toAll += n;
  }
  const harmonic = Array.from({length: N}, (_, i) => 1 / (i + 1)).reduce((a, b) => a + b, 0);
  return {N, mode, pSameNext: +(same / Math.max(1, draws - trials)).toFixed(3), drawsToMeetAll: +(toAll / trials).toFixed(2), theoryOld: +(N * harmonic).toFixed(2)};
}
const gachaResults = [2, 3, 5, 10, 19].flatMap(N => [gacha(N, 'old'), gacha(N, 'new')]);

console.log(JSON.stringify({geometry, seatTable, below, others, lifeResults, gachaResults}, null, 1));
