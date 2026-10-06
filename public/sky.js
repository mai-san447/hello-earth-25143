// 角度は度、経度は東が正、方位は北=0・東=90。大気差は含めない。
const RAD = Math.PI / 180;
// J2000。同梱の恒星カタログと同じ赤経・赤緯を使い、星座の名前は画面に出さない。
export const NORTH_CONSTELLATIONS = [
  {id: 'big-dipper', stars: [
    ['Dubhe',165.93,61.75], ['Merak',165.46,56.38], ['Phecda',178.46,53.69],
    ['Megrez',183.86,57.03], ['Alioth',193.51,55.96], ['Mizar',200.98,54.93], ['Alkaid',206.88,49.31],
  ], paths: [[1,0,3,2,1], [3,4,5,6]]},
  {id: 'cassiopeia', stars: [
    ['Caph',2.29,59.15], ['Schedar',10.13,56.54], ['Gamma Cas',14.18,60.72],
    ['Ruchbah',21.45,60.24], ['Segin',28.6,63.67],
  ], paths: [[0,1,2,3,4]]},
  {id: 'little-dipper', stars: [
    ['Polaris',37.95,89.26], ['Delta UMi',263.05,86.59], ['Epsilon UMi',251.49,82.04],
    ['Zeta UMi',236.01,77.79], ['Eta UMi',244.38,75.76], ['Pherkad',230.18,71.83], ['Kochab',222.68,74.16],
  ], paths: [[0,1,2,3,4,5,6,3]]},
].map(group => Object.freeze({...group,
  stars: Object.freeze(group.stars.map(([name,raDeg,decDeg]) => Object.freeze({name,raDeg,decDeg}))),
  paths: Object.freeze(group.paths.map(path => Object.freeze(path))),
}));
Object.freeze(NORTH_CONSTELLATIONS);
const NORTH_STAR_COUNT = 19;

export function northStarForSeq(seq) {
  if (!Number.isSafeInteger(seq) || seq < 1) throw new RangeError('願いの番号は1以上の整数です');
  let index = (seq - 1) % NORTH_STAR_COUNT;
  const cycle = Math.floor((seq - 1) / NORTH_STAR_COUNT);
  for (const constellation of NORTH_CONSTELLATIONS) {
    if (index < constellation.stars.length) {
      // 重なる願いを見分けるため、2巡目から数pxだけ離す。元の恒星の位置は変えない。
      const angle = cycle * 2.399963229728653;
      const radius = cycle ? 5 * Math.sqrt(cycle) : 0;
      return {constellation, starIndex: index, star: constellation.stars[index], cycle,
        offsetX: Math.cos(angle) * radius, offsetY: Math.sin(angle) * radius};
    }
    index -= constellation.stars.length;
  }
}

// 表示対象の願いの番号だけを受け取る。重複で完成扱いにせず、3星座を個別に判定する。
export function completedNorthConstellations(seqs) {
  const occupied = new Set(seqs.map(seq => {
    const slot = northStarForSeq(seq);
    return `${slot.constellation.id}:${slot.starIndex}`;
  }));
  return NORTH_CONSTELLATIONS.filter(group => group.stars.every((_, index) => occupied.has(`${group.id}:${index}`)));
}
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

// 上の帯。文章で説明せず、カメラの撮影情報のように「方角・場所・時刻」だけを並べる（2026-10-07 本人の判断）
export function skyCaption(latitude, longitude, time) {
  const date = new Date(time);
  const clock = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return ['北の空', coordinatesLabel(latitude, longitude), clock].filter(Boolean).join('　');
}
