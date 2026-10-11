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
