import {test} from 'node:test';
import assert from 'node:assert/strict';
import {julianDay, greenwichSiderealTime, localSiderealTime, equatorialToHorizontal, visibleStars, itokawaPosition} from '../public/sky.js';
import {compassJa, skySummary} from '../public/sky.js';
import {readFileSync} from 'node:fs';
const time = Date.parse('2000-01-01T12:00:00Z');
const near = (a,b,tolerance=1e-6) => assert.ok(Math.abs(a-b)<tolerance, `${a} ≈ ${b}`);
test('J2000のユリウス日と恒星時、東経の符号', () => {
  near(julianDay(time),2451545); near(greenwichSiderealTime(time),280.46061837);
  near(localSiderealTime(time,139.76),60.22061837);
});
test('北天の極と北極星は北に見え、高度は緯度に近い', () => {
  for (const lat of [0,35.68,65]) {
    const pole=equatorialToHorizontal(0,90,time,lat,139.76);
    near(pole.altitude,lat); near(pole.azimuth,0);
    const polaris=equatorialToHorizontal(37.95,89.264,time,lat,139.76);
    near(polaris.altitude,lat,0.74);
    assert.ok(polaris.azimuth<2 || polaris.azimuth>358);
  }
});
test('シリウスの南中高度、東西の地平線、地平線下の除外', () => {
  const ra=101.287, dec=-16.716, lat=35.68;
  const lon=ra-greenwichSiderealTime(time);
  const sirius=equatorialToHorizontal(ra,dec,time,lat,lon);
  near(sirius.altitude,90-lat+dec); near(sirius.azimuth,180);
  near(equatorialToHorizontal(90,0,time,0,-greenwichSiderealTime(time)).azimuth,90);
  near(equatorialToHorizontal(270,0,time,0,-greenwichSiderealTime(time)).azimuth,270);
  assert.equal(visibleStars([[ra,dec,1],[ra+180,-dec,2]],time,lat,lon).length,1);
});
test('イトカワのUTC補間、赤経の折り返しと期間外', () => {
  const table={days:[['2026-Oct-01',359,10],['2026-Oct-02',1,12]]};
  assert.deepEqual(itokawaPosition(table,Date.parse('2026-10-01T12:00Z')),{raDeg:0,decDeg:11});
  assert.deepEqual(itokawaPosition(table,Date.parse('2026-10-02T00:00Z')),{raDeg:1,decDeg:12});
  assert.equal(itokawaPosition(table,Date.parse('2026-10-02T00:01Z')),null);
  assert.equal(itokawaPosition(table,Date.parse('2026-09-30T23:59Z')),null);
});
test('同梱データで計算でき、不正な入力を拒否する', () => {
  const stars=JSON.parse(readFileSync(new URL('../public/sky-stars.json',import.meta.url))).stars;
  const table=JSON.parse(readFileSync(new URL('../public/itokawa-radec.json',import.meta.url)));
  assert.equal(stars.length,1604);
  assert.ok(visibleStars(stars,Date.parse('2026-10-07T00:00Z'),35.68,139.76).length>0);
  assert.deepEqual(itokawaPosition(table,Date.parse('2026-10-07T00:00Z')),{raDeg:132.787,decDeg:18.307});
  assert.throws(()=>julianDay(NaN)); assert.throws(()=>equatorialToHorizontal(0,0,time,91,0));
  assert.throws(()=>itokawaPosition({days:[['bad',0,0]]},time));
});
test('星空の部品と同梱データをオフライン用に保存する', () => {
  const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  assert.match(sw, /const REQUIRED_SHELL = \[[^\]]*'\/sky.js'/);
  assert.match(sw, /const OPTIONAL_SHELL = \[[^\]]*'\/sky-stars.json'/);
  assert.match(sw, /const OPTIONAL_SHELL = \[[^\]]*'\/itokawa-radec.json'/);
});

test('方位は、ひと言の方角にする', () => {
  assert.equal(compassJa(0), '北');
  assert.equal(compassJa(81), '東');
  assert.equal(compassJa(200), '南');
  assert.equal(compassJa(-45), '北西');
});

test('上の帯は、ひと言で空を説明する', () => {
  assert.equal(skySummary('東京', {azimuth: 81, altitude: 20}), '東京の、今の空 · 25143 は東の空');
  assert.equal(skySummary('現在地', {azimuth: 81, altitude: -5}), '現在地の、今の空 · 25143 はいま地平線の下');
  assert.equal(skySummary('東京', null), '東京の、今の空');
});
