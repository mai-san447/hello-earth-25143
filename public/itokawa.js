// イトカワまでの実際の距離（#6）。
// NASA/JPL Horizons の暦（地球中心から見た距離、1日ごと、00:00 UT）を itokawa-distance.json に同梱し、
// 病室でもネットなしで出せるようにする。外部APIには問い合わせない。

export const AU_KM = 149597870.7;
const DAY_MS = 24 * 60 * 60 * 1000;

function utcDayNumber(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

// 端末の暦の日付で、その日の距離（km）を返す。表の範囲外なら null。
// 表は 00:00 UT の値。日本時間との数時間の差は「約○億km」の表示には影響しない。
export function distanceKmOn(table, time) {
  if (!table || !Array.isArray(table.values) || table.unit !== 'au') return null;
  const date = new Date(time);
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS;
  const index = Math.round((today - utcDayNumber(table.startDate)) / (table.stepDays || 1));
  const au = table.values[index];
  return Number.isFinite(au) ? au * AU_KM : null;
}

export function formatDistanceJa(km) {
  if (km >= 1e8) return `約${(km / 1e8).toFixed(1)}億km`;
  return `約${Math.round(km / 1e4).toLocaleString('ja-JP')}万km`;
}

// 光の速さ（km/秒）。遠さを「時間」で感じてもらうために使う（#26、Slowly の「遅さを価値に」から）
export const LIGHT_KM_PER_S = 299792.458;

export function lightMinutes(km) {
  return km == null ? null : Math.max(1, Math.round(km / LIGHT_KM_PER_S / 60));
}

export function distanceMessage(km) {
  return km == null ? '' : `いま、イトカワは地球から${formatDistanceJa(km)}。光でも約${lightMinutes(km)}分かかる距離です。`;
}
