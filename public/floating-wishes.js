// 重なった星は最も近い1つだけ選び、言葉が一度に増えないようにする。
export function nearestStar(points, x, y, radius = 24) {
  if (![x, y, radius].every(Number.isFinite) || radius < 0) return null;
  let nearest = null;
  let distance = radius;
  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    const next = Math.hypot(point.x - x, point.y - y);
    if (next <= distance && (!nearest || next < distance)) {
      nearest = point;
      distance = next;
    }
  }
  return nearest;
}

// 見ているだけで願いが1つずつ浮かぶ間隔（2026-10-11、本人が案Cに決定）。最初の1つは少し早めに出す
export const AUTO_FIRST_MS = 3500;
export const AUTO_INTERVAL_MS = 8000;

// 続けて同じ星を選ばないよう、直前の星は（ほかに候補があれば）除いてから選ぶ
export function nextAutoStar(points, lastId, random) {
  const others = points.length > 1 ? points.filter(point => (point.star?.id ?? point.wish?.id) !== lastId) : points;
  // 自分の星を少し多めに読み、他の人の言葉だけで空が埋まらないようにする。
  return randomStar(others.flatMap(point => point.star ? [point] : [point, point]), random);
}

// 乱数を外から渡して、空の星空や選ばれる端の星も確かめられるようにする。
export function randomStar(points, random) {
  if (!points.length || !Number.isFinite(random) || random < 0 || random >= 1) return null;
  return points[Math.floor(random * points.length)];
}

// タップで拾う星（2026-10-12）。スマホでは自分の星どうしが最短 9.8px しか離れず、指の範囲（半径24px）に平均3個、最大5個入る。
// 範囲は狭めず（押し外すと反応しなくなる）、①範囲に自分の星があれば他の人の星は拾わない ②同じ場所をもう一度タップすると、次に近い星へ移る。
export const TAP_RADIUS = 24;
export const TAP_REPEAT_MS = 6000;

// 範囲内の星を近い順に。自分の星（wish を持つ点）があれば、自分の星だけ
export function tapCandidates(points, x, y, radius = TAP_RADIUS) {
  if (![x, y, radius].every(Number.isFinite) || radius < 0) return [];
  const inReach = points
    .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y))
    .map(point => ({point, distance: Math.hypot(point.x - x, point.y - y)}))
    .filter(item => item.distance <= radius)
    .sort((a, b) => a.distance - b.distance)
    .map(item => item.point);
  const own = inReach.filter(point => point.wish && !point.star);
  return own.length ? own : inReach;
}

// 前のタップと同じ場所（範囲内）で、時間がたっていなければ、次の候補へ。そうでなければいちばん近い星
export function tapIndex(previous, x, y, now, count, radius = TAP_RADIUS) {
  if (!count) return -1;
  const again = previous && Number.isFinite(previous.time) && now - previous.time <= TAP_REPEAT_MS &&
    Math.hypot(previous.x - x, previous.y - y) <= radius;
  return again ? (previous.index + 1) % count : 0;
}
