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

// 乱数を外から渡して、空の星空や選ばれる端の星も確かめられるようにする。
export function randomStar(points, random) {
  if (!points.length || !Number.isFinite(random) || random < 0 || random >= 1) return null;
  return points[Math.floor(random * points.length)];
}
