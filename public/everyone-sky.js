// みんなの空（2026-10-12）。公開された願いを、天球の内側から見回す画面。
// わたしの空（いつもの画面）は「預けて、帰ってくる」に絞り、他の人の願いはここで見に行く（docs/わたしの空とみんなの空_設計.md）。
// 天球は半径1の球。見ている向き（赤経・赤緯）を中心に、立体射影（ステレオ射影）で画面に写す。
// 立体射影は角度を保つので、端でも星の並びの形がゆがみにくい。視野を狭めると「近づく」。
// 計算は純粋な関数にして node --test で確かめ、描画とタッチ操作は createEveryoneSky にまとめる。

const RAD = Math.PI / 180;

// 視野（縦の角度）。広いほど遠くから見回し、狭いほど近づく
// 広げすぎると端がゆがんで酔いやすいので、90度までにする（2026-10-12 本人「くるくる気持ち悪い」）
export const FOV = Object.freeze({min: 24, max: 90, start: 64});
// 近づくと言葉が読める。視野がこれより狭いとき、画面の中心に近い星から言葉を出す
export const READ_FOV = 48;
export const READ_COUNT = 4;
// 極の真上・真下では向きが決まらないので、見上げる角度に上限を置く
// 極の近くでは、横になぞるだけで空が中心のまわりに回って見える（赤経の線が極に集まるため）。
// 酔わないよう、見上げるのは赤緯60度までにする（極の星は、視野の上のほうに見える）
export const PITCH_LIMIT = 60;
export const PICK_RADIUS = 26;

export function radecToVector(raDeg, decDeg) {
  const ra = raDeg * RAD, dec = decDeg * RAD;
  return [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// 見ている向きの前・右・上。天球の内側から見るので、赤経が増える東は左になる（本物の空と同じ向き）
export function viewBasis({raDeg, decDeg}) {
  const ra = raDeg * RAD, dec = decDeg * RAD;
  const forward = radecToVector(raDeg, decDeg);
  const east = [-Math.sin(ra), Math.cos(ra), 0];
  const right = [-east[0], -east[1], -east[2]];
  const up = [-Math.sin(dec) * Math.cos(ra), -Math.sin(dec) * Math.sin(ra), Math.cos(dec)];
  return {forward, right, up};
}

// 視野 fov（縦の角度）が画面の高さに収まる縮尺。立体射影では角度 θ の点が 2·tan(θ/2) の距離に写る
export function projectionScale(fovDeg, height) {
  return (height / 2) / (2 * Math.tan(fovDeg * RAD / 4));
}

// 天球上の向き v を画面に写す。真後ろの近く（前との角度が約150度より大きい）は描かない
export function project(v, basis, scale, width, height) {
  const cos = dot(v, basis.forward);
  if (cos < -0.866) return null;
  const k = 2 / (1 + cos);
  return {x: width / 2 + scale * k * dot(v, basis.right), y: height / 2 - scale * k * dot(v, basis.up), cos};
}

// ドラッグの量（ピクセル）を、見る向きの変化（度）に直す。指の下の星がおおよそ指についてくる
export function dragView(view, dx, dy, fovDeg, height) {
  const degPerPx = fovDeg / height;
  // 赤緯が高いほど赤経の1度は短いので、指の動きに合わせて少し大きく回す（最大2倍。それ以上は回りすぎて酔う）
  const cosDec = Math.max(0.5, Math.cos(view.decDeg * RAD));
  const raDeg = (((view.raDeg + dx * degPerPx / cosDec) % 360) + 360) % 360;
  const decDeg = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, view.decDeg + dy * degPerPx));
  return {raDeg, decDeg};
}

export function clampFov(fovDeg) {
  return Math.max(FOV.min, Math.min(FOV.max, fovDeg));
}

// 触れた場所にいちばん近い星（指で触れるので少し離れていても拾う）
export function pickPoint(points, x, y, radius = PICK_RADIUS) {
  let best = null, bestDistance = radius;
  for (const point of points) {
    const distance = Math.hypot(point.x - x, point.y - y);
    if (distance <= bestDistance) { best = point; bestDistance = distance; }
  }
  return best;
}

// 近づいたとき、言葉を出す星。画面の中心に近い順に、重ならない（縦に間をあける）ものだけ
export function readablePoints(points, width, height, fovDeg, count = READ_COUNT) {
  if (fovDeg > READ_FOV) return [];
  const cx = width / 2, cy = height / 2;
  const reach = Math.min(width, height) * 0.42;
  const chosen = [];
  for (const point of [...points].filter(p => !p.own).sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))) {
    if (Math.hypot(point.x - cx, point.y - cy) > reach) break;
    if (chosen.some(other => Math.abs(other.y - point.y) < 30 && Math.abs(other.x - point.x) < 160)) continue;
    chosen.push(point);
    if (chosen.length >= count) break;
  }
  return chosen;
}

// 星の段階ごとの描き方。預けた願いは淡く、やってみることにした願いは明るく、叶った願いは尾を引く
export function starLook(star, own) {
  // 願いの星は、背景の本物の星（点）より大きく、光がにじむ。段階が進むほど明るく大きい
  if (own) return {radius: 4, halo: 24, color: [255, 214, 140], alpha: 1, tail: 0};
  if (star.stage === 'fulfilled') return {radius: 3.2, halo: 18, color: [214, 234, 255], alpha: 0.95, tail: 30};
  if (star.stage === 'doing') return {radius: 4, halo: 26, color: [255, 246, 226], alpha: star.returned ? 0.45 : 1, tail: 0};
  return {radius: 3, halo: 17, color: [186, 210, 255], alpha: star.returned ? 0.35 : 0.85, tail: 0};
}

/**
 * 画面を作る。描画と操作だけを持ち、データ（星・自分の星・カタログ）は外から渡す。
 * @param {{canvas: HTMLCanvasElement, reducedMotion: boolean, onSelect: (point: object|null) => void, seed: (id: string) => {raDeg: number, decDeg: number, phase: number}}} options
 */
export function createEveryoneSky({canvas, reducedMotion, onSelect, seed, onHover = () => {}, onFrame = () => {}}) {
  const context = canvas.getContext('2d');
  let width = 0, height = 0, ratio = 1;
  let view = {raDeg: 0, decDeg: 60};
  let fov = FOV.start;
  let stars = [];
  let ownIds = new Set();
  let background = [];
  let points = [];
  let selectedId = null;
  let hoveredId = null;
  let anim = null;
  let running = false;
  let frame = 0;
  const pointers = new Map();
  let pinchStart = null;
  let moved = 0;

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width; height = bounds.height;
    ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw(performance.now());
  }

  function setCatalog(catalog) {
    // 肉眼でよく見える5.5等級までを背景に使う（全天。数千個なので毎回の計算で足りる）
    background = Array.isArray(catalog?.stars) ? catalog.stars.filter(([, , mag]) => mag <= 5.5).map(([raDeg, decDeg, mag]) => ({v: radecToVector(raDeg, decDeg), mag})) : [];
    draw(performance.now());
  }

  function setStars(list, own) {
    ownIds = new Set(own);
    stars = list.map(star => {
      const position = seed(star.id);
      return {star, v: radecToVector(position.raDeg, position.decDeg), phase: position.phase, own: ownIds.has(star.id)};
    });
    if (selectedId && !stars.some(item => item.star.id === selectedId)) select(null);
    draw(performance.now());
  }

  // zoom：近づいて言葉を読める距離まで寄せるか（開いた直後に向きだけ合わせるときは寄せない）
  function lookAt(starId, zoomIn = true) {
    const item = stars.find(entry => entry.star.id === starId);
    if (!item) return false;
    const [x, y, z] = item.v;
    const target = {raDeg: ((Math.atan2(y, x) / RAD) + 360) % 360, decDeg: Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, Math.asin(z) / RAD))};
    const targetFov = zoomIn ? Math.min(fov, READ_FOV - 6) : fov;
    // ぱっと飛ぶと落ち着かないので、0.6秒かけて向きを変える（動きを減らす設定では、すぐ切り替える）
    if (reducedMotion || !running) { view = target; fov = targetFov; anim = null; }
    else anim = {from: {...view}, fromFov: fov, to: target, toFov: targetFov, start: performance.now()};
    draw(performance.now());
    return true;
  }

  function stepAnimation(time) {
    if (!anim) return;
    const t = Math.min(1, (time - anim.start) / 600);
    const ease = 1 - (1 - t) ** 3;
    // 赤経は近いほうの向きに回る（359度から1度へは、2度だけ進む）
    const dRa = ((anim.to.raDeg - anim.from.raDeg + 540) % 360) - 180;
    view = {raDeg: (anim.from.raDeg + dRa * ease + 360) % 360, decDeg: anim.from.decDeg + (anim.to.decDeg - anim.from.decDeg) * ease};
    fov = anim.fromFov + (anim.toFov - anim.fromFov) * ease;
    if (t >= 1) anim = null;
  }

  function select(point) {
    selectedId = point?.star.id ?? null;
    onSelect(point);
    draw(performance.now());
  }

  // キーボード・読み上げで順に巡る。次の星を中心に寄せて選ぶ
  function focusNext() {
    if (!stars.length) return null;
    const index = stars.findIndex(item => item.star.id === selectedId);
    const next = stars[(index + 1) % stars.length];
    lookAt(next.star.id);
    const point = points.find(item => item.star.id === next.star.id) ?? {...next, x: width / 2, y: height / 2};
    select(point);
    return next.star;
  }

  function draw(time) {
    if (!width || !height) return;
    const basis = viewBasis(view);
    const scale = projectionScale(fov, height);
    context.clearRect(0, 0, width, height);
    // 背景の本物の星。視野が狭いほど少し明るく（近づいた感じ）
    const boost = Math.min(1.6, FOV.start / fov);
    for (const star of background) {
      const p = project(star.v, basis, scale, width, height);
      if (!p || p.x < -4 || p.x > width + 4 || p.y < -4 || p.y > height + 4) continue;
      // 本当の明るさは等級1つで約2.5倍ちがう（ポグソンの式 10^(-0.4Δm)）。そのままでは暗い星が画面から消えるので、
      // 差を縮めて（指数を1/2.5にして）描き、下限も置く。人の目も明るさの差を縮めて感じる
      const brightness = Math.min(1, (0.28 + 0.72 * Math.pow(10, -0.4 * (star.mag - 1) / 2.5)) * boost);
      context.fillStyle = `rgba(222, 230, 245, ${brightness})`;
      const size = (0.9 + Math.max(0, 4.5 - star.mag) * 0.42) * Math.sqrt(boost);
      context.fillRect(p.x - size / 2, p.y - size / 2, size, size);
    }
    points = [];
    for (const item of stars) {
      const p = project(item.v, basis, scale, width, height);
      if (!p || p.x < -20 || p.x > width + 20 || p.y < -20 || p.y > height + 20) continue;
      const look = starLook(item.star, item.own);
      const twinkle = reducedMotion ? 1 : 0.85 + Math.sin(time * 0.0016 + item.phase * 6.283) * 0.15;
      const grow = Math.min(1.5, Math.sqrt(boost));
      const [r, g, b] = look.color;
      context.save();
      context.globalAlpha = look.alpha;
      if (look.tail) {
        const tail = context.createLinearGradient(p.x - look.tail, p.y - look.tail * 0.45, p.x, p.y);
        tail.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
        tail.addColorStop(1, `rgba(${r}, ${g}, ${b}, .8)`);
        context.strokeStyle = tail; context.lineWidth = 1.2;
        context.beginPath(); context.moveTo(p.x - look.tail, p.y - look.tail * 0.45); context.lineTo(p.x, p.y); context.stroke();
      }
      const halo = look.halo * grow * twinkle;
      const glow = context.createRadialGradient(p.x, p.y, 0, p.x, p.y, halo);
      glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, .9)`);
      glow.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, .3)`);
      glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      context.fillStyle = glow;
      context.beginPath(); context.arc(p.x, p.y, halo, 0, Math.PI * 2); context.fill();
      context.fillStyle = 'rgba(255, 250, 238, .95)';
      context.beginPath(); context.arc(p.x, p.y, look.radius * grow * 0.6, 0, Math.PI * 2); context.fill();
      if (item.star.id === selectedId) {
        context.globalAlpha = 1;
        context.strokeStyle = 'rgba(234, 203, 131, .9)'; context.lineWidth = 1;
        context.beginPath(); context.arc(p.x, p.y, halo + 6, 0, Math.PI * 2); context.stroke();
      }
      context.restore();
      points.push({...item, x: p.x, y: p.y});
    }
    // 近づいたときの言葉。選んだ星の言葉は画面の下のカードに出すので、ここでは描かない
    const readable = readablePoints(points.filter(p => p.star.id !== selectedId && p.star.id !== hoveredId), width, height, fov);
    context.save();
    context.font = '14px "Zen Kaku Gothic New", "Hiragino Sans", "Yu Gothic", sans-serif';
    context.textAlign = 'center';
    for (const point of readable) {
      const fade = 1 - Math.min(1, Math.hypot(point.x - width / 2, point.y - height / 2) / (Math.min(width, height) * 0.42));
      context.globalAlpha = 0.35 + 0.65 * fade;
      context.fillStyle = 'rgba(5, 8, 18, .55)';
      const label = point.star.text;
      const w = context.measureText(label).width + 16;
      context.fillRect(point.x - w / 2, point.y - 34, w, 22);
      context.fillStyle = '#f2ead6';
      context.fillText(label, point.x, point.y - 18);
    }
    context.restore();
    // 選んだ星・カーソルを当てた星の言葉は、画面の部品（HTML）で星の横に出す。星が動いたら一緒に動かす
    onFrame(points);
  }

  function loop(time) {
    if (!running) return;
    stepAnimation(time);
    draw(time);
    frame = requestAnimationFrame(loop);
  }

  function open() {
    running = true;
    resize();
    if (!reducedMotion) frame = requestAnimationFrame(loop);
  }
  function close() {
    running = false;
    cancelAnimationFrame(frame);
    pointers.clear();
    select(null);
  }

  // ＋−のボタンでも、なめらかに近づく・離れる（ホイールは指の動きに合わせてすぐ変える）
  function zoom(factor) {
    const toFov = clampFov((anim?.toFov ?? fov) * factor);
    if (reducedMotion || !running) { fov = toFov; anim = null; }
    else anim = {from: {...view}, fromFov: fov, to: anim?.to ?? {...view}, toFov, start: performance.now()};
    draw(performance.now());
  }
  function rotate(dxDeg, dyDeg) {
    view = dragView(view, dxDeg * height / fov, dyDeg * height / fov, fov, height);
    draw(performance.now());
  }

  canvas.addEventListener('pointerdown', event => {
    anim = null;
    canvas.setPointerCapture?.(event.pointerId);
    pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
    moved = 0;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStart = {distance: Math.hypot(a.x - b.x, a.y - b.y), fov};
    }
  });
  canvas.addEventListener('pointermove', event => {
    const previous = pointers.get(event.pointerId);
    if (!previous) {
      // マウスでは、星にカーソルを当てるだけで言葉が見える（2026-10-12 本人の判断）
      if (event.pointerType !== 'mouse') return;
      const bounds = canvas.getBoundingClientRect();
      const hover = pickPoint(points, event.clientX - bounds.left, event.clientY - bounds.top);
      const id = hover?.star.id ?? null;
      canvas.style.cursor = hover ? 'pointer' : '';
      if (id !== hoveredId) { hoveredId = id; onHover(hover); if (reducedMotion || !running) draw(performance.now()); }
      return;
    }
    const current = {x: event.clientX, y: event.clientY};
    pointers.set(event.pointerId, current);
    if (pointers.size === 2 && pinchStart) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance > 0) fov = clampFov(pinchStart.fov * pinchStart.distance / distance);
      moved += 10;
    } else if (pointers.size === 1) {
      const dx = current.x - previous.x, dy = current.y - previous.y;
      moved += Math.abs(dx) + Math.abs(dy);
      view = dragView(view, dx, dy, fov, height);
    }
    if (reducedMotion || !running) draw(performance.now());
  });
  const release = event => {
    const wasTap = pointers.size === 1 && moved < 8;
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinchStart = null;
    if (wasTap && event.type === 'pointerup') {
      const bounds = canvas.getBoundingClientRect();
      select(pickPoint(points, event.clientX - bounds.left, event.clientY - bounds.top));
    }
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointerleave', () => { if (hoveredId) { hoveredId = null; canvas.style.cursor = ''; onHover(null); } });
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    zoom(Math.exp(event.deltaY * 0.0012));
  }, {passive: false});

  return {
    resize, setCatalog, setStars, open, close, focusNext, lookAt, zoom, rotate, select,
    get fov() { return fov; },
    get view() { return {...view}; },
  };
}
