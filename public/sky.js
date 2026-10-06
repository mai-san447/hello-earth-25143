// 角度は度、経度は東が正、方位は北=0・東=90。大気差は含めない。
const RAD = Math.PI / 180;
const wrap = value => value >= 0 && value < 360 ? value : ((value % 360) + 360) % 360;
function finite(...values) {
  if (!values.every(Number.isFinite)) throw new TypeError('天文計算の値が不正です');
}
export function julianDay(time) {
  const ms = time instanceof Date ? time.getTime() : time;
  finite(ms);
  return ms / 86400000 + 2440587.5;
}
export function greenwichSiderealTime(time) {
  const days = julianDay(time) - 2451545;
  const t = days / 36525;
  return wrap(280.46061837 + 360.98564736629 * days + 0.000387933 * t * t - t * t * t / 38710000);
}
export function localSiderealTime(time, longitude) {
  finite(longitude);
  return wrap(greenwichSiderealTime(time) + longitude);
}
export function equatorialToHorizontal(raDeg, decDeg, time, latitude, longitude) {
  finite(raDeg, decDeg, latitude, longitude);
  if (Math.abs(latitude) > 90 || Math.abs(decDeg) > 90) throw new RangeError('緯度・赤緯は±90度以内です');
  const h = (localSiderealTime(time, longitude) - raDeg) * RAD;
  const d = decDeg * RAD;
  const p = latitude * RAD;
  const east = -Math.cos(d) * Math.sin(h);
  const north = Math.sin(d) * Math.cos(p) - Math.cos(d) * Math.cos(h) * Math.sin(p);
  const up = Math.sin(d) * Math.sin(p) + Math.cos(d) * Math.cos(h) * Math.cos(p);
  return {altitude: Math.asin(Math.max(-1, Math.min(1, up))) / RAD, azimuth: wrap(Math.atan2(east, north) / RAD)};
}
export function visibleStars(stars, time, latitude, longitude) {
  return stars.map(([ra, dec, magnitude]) => {
    finite(magnitude);
    // 赤経・赤緯も返す（星ごとの色やまたたきを、時間がたっても変わらない値で決めるため）
    return {...equatorialToHorizontal(ra, dec, time, latitude, longitude), magnitude, raDeg: ra, decDeg: dec};
  }).filter(star => star.altitude > 0);
}
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function dayTime(date) {
  const match = /^(\d{4})-([A-Z][a-z]{2})-(\d{2})$/.exec(date);
  if (!match || !MONTHS.includes(match[2])) throw new TypeError('暦の日付が不正です');
  return Date.UTC(Number(match[1]), MONTHS.indexOf(match[2]), Number(match[3]));
}
export function itokawaPosition(table, time) {
  const ms = time instanceof Date ? time.getTime() : time;
  finite(ms);
  const days = table.days;
  if (!days?.length || ms < dayTime(days[0][0]) || ms > dayTime(days.at(-1)[0])) return null;
  let i = 0;
  while (i < days.length - 1 && dayTime(days[i + 1][0]) <= ms) i++;
  const a = days[i], b = days[i + 1] ?? a;
  finite(a[1], a[2], b[1], b[2]);
  const fraction = a === b ? 0 : (ms - dayTime(a[0])) / (dayTime(b[0]) - dayTime(a[0]));
  // 赤経0度をまたぐ日は短い方向へ補間する。
  const delta = wrap(b[1] - a[1] + 180) - 180;
  return {raDeg: wrap(a[1] + delta * fraction), decDeg: a[2] + (b[2] - a[2]) * fraction};
}

// 方位（北0°・東90°）を、ひと言の方角にする。画面では数字ではなく「東の空」のように言う
const DIRECTIONS = ['北', '北東', '東', '南東', '南', '南西', '西', '北西'];
export function compassJa(azimuth) {
  const value = ((Number(azimuth) % 360) + 360) % 360;
  return DIRECTIONS[Math.round(value / 45) % 8];
}

// 緯度経度は小数点以下1けた（約10km）に丸めて出す。画面を写して共有したとき、住んでいる場所が細かく分からないように
export function coordinatesLabel(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return '';
  const lat = `${Math.abs(latitude).toFixed(1)}°${latitude >= 0 ? 'N' : 'S'}`;
  const lon = `${Math.abs(longitude).toFixed(1)}°${longitude >= 0 ? 'E' : 'W'}`;
  return `${lat} ${lon}`;
}

// 上の帯に出す、ひと言の空の説明。place は「東京」か「現在地」
export function skySummary(place, itokawa, latitude, longitude) {
  const where = [place, coordinatesLabel(latitude, longitude)].filter(Boolean).join(' ');
  if (!itokawa) return `${where} の、今の空`;
  if (itokawa.altitude <= 0) return `${where} の、今の空 · 25143 はいま地平線の下`;
  return `${where} の、今の空 · 25143 は${compassJa(itokawa.azimuth)}の空`;
}
