import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectPolarStar, greenwichSiderealTime, NORTH_CONSTELLATIONS, northStarForSeq} from '../public/sky.js';

const time = Date.parse('2026-10-06T15:00:00Z'); // 東京の10月深夜
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} ≈ ${b}`);
const project = (ra, dec, width = 390, height = 844, at = time, lon = 139.76) =>
  projectPolarStar(ra, dec, at, 35.68, lon, width, height);

test('天の北極は時刻・経度・縦横比によらず中心、北極星はわずかに離れる', () => {
  for (const [w, h] of [[390,844], [1440,900], [844,390]]) {
    for (const lon of [-180, 0, 139.76, 180]) {
      for (const ra of [0, 90, 280]) {
        const pole = project(ra, 90, w, h, time, lon);
        near(pole.x, w / 2); near(pole.y, h / 2);
      }
    }
    const polaris = project(37.95, 89.26, w, h);
    near(Math.hypot(polaris.x - w / 2, polaris.y - h / 2), .74 / 50 * Math.min(w,h) * .45);
  }
});

test('赤緯40度は短辺の45%の円周、それより北の同梱恒星はすべて円内', () => {
  const stars = JSON.parse(readFileSync(new URL('../public/sky-stars.json', import.meta.url))).stars;
  for (const [w,h] of [[390,844], [1440,900], [844,390]]) {
    const radius = Math.min(w,h) * .45;
    for (let ra = 0; ra < 360; ra += 15) {
      const p = project(ra,40,w,h);
      near(Math.hypot(p.x-w/2,p.y-h/2), radius);
    }
    for (const [ra,dec] of stars.filter(([,dec]) => dec >= 40)) {
      const p = project(ra,dec,w,h);
      assert.ok(Math.hypot(p.x-w/2,p.y-h/2) <= radius + 1e-8);
    }
  }
});

test('上の南中から左へ反時計回りに回り、下の南中が地平線側になる', () => {
  const ra = greenwichSiderealTime(time);
  const top = project(ra,40,400,400,time,0);
  const later = project(ra,40,400,400,time + 3600000,0);
  const east = project(ra,40,400,400,time,90);
  const bottom = project(ra,40,400,400,time,180);
  const west = project(ra,40,400,400,time,270);
  near(top.x,200); near(top.y,20);
  assert.ok(later.x < top.x && later.y > top.y);
  near(east.x,20); near(east.y,200);
  near(bottom.x,200); near(bottom.y,380);
  near(west.x,380); near(west.y,200);
  assert.ok(top.altitude > 0);
  assert.ok(bottom.altitude < 0);
  assert.equal(bottom.visible,true);
});

test('季節・時刻・位置・縦横比によらず30個の願いと3星座が画面内に残る', () => {
  for (const [w,h] of [[320,568], [390,844], [1440,900], [844,390]]) {
    for (let month = 0; month < 12; month++) {
      for (let hour = 0; hour < 24; hour++) {
        for (const [lat,lon] of [[35.68,139.76],[65,-150],[-33.86,151.21]]) {
          const at = Date.UTC(2026,month,7,hour);
          for (let seq = 1; seq <= 30; seq++) {
            const {star,offsetX,offsetY} = northStarForSeq(seq);
            const p = projectPolarStar(star.raDeg,star.decDeg,at,lat,lon,w,h);
            assert.ok(p.visible && p.x+offsetX > 0 && p.x+offsetX < w && p.y+offsetY > 0 && p.y+offsetY < h);
          }
          for (const group of NORTH_CONSTELLATIONS) for (const star of group.stars) {
            const p = projectPolarStar(star.raDeg,star.decDeg,at,lat,lon,w,h);
            assert.ok(p.visible && p.x > 0 && p.x < w && p.y > 0 && p.y < h);
          }
        }
      }
    }
  }
});

test('投影の不正値・範囲外・ゼロサイズを拒否する', () => {
  for (const args of [
    [NaN,40,time,35,139,390,844], [0,91,time,35,139,390,844],
    [0,40,time,91,139,390,844], [0,40,NaN,35,139,390,844],
    [0,40,time,35,139,0,844], [0,40,time,35,139,390,-1],
  ]) assert.throws(() => projectPolarStar(...args));
});

test('願いを何巡も預けても位置のずれは8px以内に収まる', () => {
  for (const seq of [39, 1000, 100000, Number.MAX_SAFE_INTEGER]) {
    const slot = northStarForSeq(seq);
    assert.ok(Math.hypot(slot.offsetX,slot.offsetY) <= 8 + 1e-8);
    const p = project(slot.star.raDeg,slot.star.decDeg,320,568);
    assert.ok(p.x+slot.offsetX > 0 && p.x+slot.offsetX < 320 && p.y+slot.offsetY > 0 && p.y+slot.offsetY < 568);
  }
});
