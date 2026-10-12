import assert from 'node:assert/strict';
import {test} from 'node:test';
import {FOV, PITCH_LIMIT, READ_FOV, clampFov, dragView, pickPoint, project, projectionScale, radecToVector, readablePoints, starLook, viewBasis} from '../public/everyone-sky.js';

const W = 390, H = 844;
const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

test('赤経・赤緯は長さ1の向きになる', () => {
  for (const [ra, dec] of [[0, 0], [90, 45], [210, -60], [359, 89]]) {
    const v = radecToVector(ra, dec);
    assert.ok(close(Math.hypot(...v), 1));
  }
});

test('見ている向きは画面の中心に、視野の端は画面の上の端に写る（縮尺が視野と合っている）', () => {
  for (const fov of [FOV.min, FOV.start, FOV.max]) {
    const view = {raDeg: 120, decDeg: 30};
    const basis = viewBasis(view);
    const scale = projectionScale(fov, H);
    const center = project(radecToVector(120, 30), basis, scale, W, H);
    assert.ok(close(center.x, W / 2) && close(center.y, H / 2));
    // 真上に視野の半分だけ離れた星は、画面の上の端（y = 0）
    const top = project(radecToVector(120, 30 + fov / 2), basis, scale, W, H);
    assert.ok(close(top.x, W / 2, 1e-6) && close(top.y, 0, 1e-6), `fov ${fov}: ${top.y}`);
  }
});

test('天球の内側から見るので、東（赤経が大きいほう）は左、北は上', () => {
  const view = {raDeg: 200, decDeg: 10};
  const basis = viewBasis(view);
  const scale = projectionScale(60, H);
  const east = project(radecToVector(205, 10), basis, scale, W, H);
  const north = project(radecToVector(200, 15), basis, scale, W, H);
  assert.ok(east.x < W / 2);
  assert.ok(north.y < H / 2);
});

test('真後ろの近くは描かない', () => {
  const basis = viewBasis({raDeg: 0, decDeg: 0});
  assert.equal(project(radecToVector(180, 0), basis, projectionScale(60, H), W, H), null);
  assert.ok(project(radecToVector(100, 0), basis, projectionScale(60, H), W, H));
});

test('立体射影は角度を保つ。小さな正方形は、画面の端でも正方形のまま写る', () => {
  const basis = viewBasis({raDeg: 0, decDeg: 0});
  const scale = projectionScale(90, H);
  // 中心から40度離れた場所に、赤経・赤緯それぞれ0.1度の小さな十字
  const at = (ra, dec) => project(radecToVector(ra, dec), basis, scale, W, H);
  const o = at(40, 0), r = at(40.1, 0), u = at(40, 0.1);
  const dx = Math.hypot(r.x - o.x, r.y - o.y), dy = Math.hypot(u.x - o.x, u.y - o.y);
  assert.ok(Math.abs(dx / dy - 1) < 0.01, `縦横比 ${dx / dy}`);
  const angle = Math.acos(((r.x - o.x) * (u.x - o.x) + (r.y - o.y) * (u.y - o.y)) / (dx * dy)) * 180 / Math.PI;
  assert.ok(Math.abs(angle - 90) < 0.5, `角度 ${angle}`);
});

test('なぞると見回せる。右になぞると東（赤経が増える向き）を見る。見上げる角度には上限、赤経は一周する', () => {
  const view = {raDeg: 350, decDeg: 0};
  const right = dragView(view, 200, 0, 60, H);
  assert.ok(right.raDeg > 0 && right.raDeg < 10, `0度をまたいで一周する ${right.raDeg}`);
  assert.ok(dragView(view, 0, 100, 60, H).decDeg > 0);
  assert.equal(dragView({raDeg: 0, decDeg: 80}, 0, 10000, 60, H).decDeg, PITCH_LIMIT);
  assert.equal(dragView({raDeg: 0, decDeg: -80}, 0, -10000, 60, H).decDeg, -PITCH_LIMIT);
  // 指の下の星は、指とほぼ同じだけ動く（視野60度で、画面の高さの1/6なぞると10度）
  assert.ok(close(dragView({raDeg: 0, decDeg: 0}, 0, H / 6, 60, H).decDeg, 10));
});

test('近づける範囲は24〜100度', () => {
  assert.equal(clampFov(5), FOV.min);
  assert.equal(clampFov(500), FOV.max);
  assert.equal(clampFov(60), 60);
});

test('触れた場所にいちばん近い星を拾う。遠ければ拾わない', () => {
  const points = [{x: 100, y: 100, id: 'a'}, {x: 110, y: 100, id: 'b'}];
  assert.equal(pickPoint(points, 108, 100).id, 'b');
  assert.equal(pickPoint(points, 200, 200), null);
});

test('近づいたときだけ、中心に近い他の人の星から言葉を出す。重なる位置と自分の星は出さない', () => {
  const points = [
    {x: W / 2 + 5, y: H / 2, own: false, id: 1},
    {x: W / 2 + 40, y: H / 2 + 10, own: false, id: 2},
    {x: W / 2 - 60, y: H / 2 + 80, own: false, id: 3},
    {x: W / 2, y: H / 2 + 2, own: true, id: 4},
    {x: 5, y: 5, own: false, id: 5},
  ];
  assert.deepEqual(readablePoints(points, W, H, READ_FOV + 1), []);
  assert.deepEqual(readablePoints(points, W, H, 30).map(p => p.id), [1, 3]);
});

test('段階ごとの描き方：自分の星は金色、やってみることにした星は預けた星より明るく大きい。帰還した星は薄い', () => {
  const wish = starLook({stage: 'wish'}, false), doing = starLook({stage: 'doing'}, false), fulfilled = starLook({stage: 'fulfilled'}, false);
  assert.deepEqual(starLook({stage: 'wish'}, true).color, [255, 214, 140]);
  assert.ok(doing.alpha > wish.alpha && doing.radius > wish.radius && doing.halo > wish.halo);
  assert.ok(fulfilled.tail > 0 && wish.tail === 0);
  assert.ok(starLook({stage: 'wish', returned: true}, false).alpha < wish.alpha);
});

test('酔わないように：見上げるのは赤緯60度まで、横の動きの増え方は最大2倍、視野は90度まで', () => {
  assert.equal(PITCH_LIMIT, 60);
  assert.equal(FOV.max, 90);
  // 同じだけ横になぞったとき、赤緯60度での回り方は赤道の2倍まで
  const atEquator = dragView({raDeg: 100, decDeg: 0}, 50, 0, 60, H).raDeg - 100;
  const atSixty = dragView({raDeg: 100, decDeg: 60}, 50, 0, 60, H).raDeg - 100;
  assert.ok(Math.abs(atSixty / atEquator - 2) < 1e-9, `${atSixty / atEquator}`);
});
