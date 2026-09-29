import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {AU_KM, distanceKmOn, distanceMessage, formatDistanceJa, lightMinutes} from '../public/itokawa.js';

const table = JSON.parse(readFileSync(new URL('../public/itokawa-distance.json', import.meta.url), 'utf8'));
const on = (y, m, d) => new Date(y, m - 1, d, 12).getTime();

test('同梱した暦は 2026-01-01 から 2030-12-31 までの1日ごと', () => {
  assert.equal(table.unit, 'au');
  assert.equal(table.startDate, '2026-01-01');
  assert.equal(table.values.length, 1826);
  assert.match(table.source, /JPL Horizons/);
});

test('その日の距離を暦から引く（JPL Horizons 2026-09-29 の値）', () => {
  assert.ok(Math.abs(distanceKmOn(table, on(2026, 9, 29)) - 1.78599178 * AU_KM) < 1);
  assert.ok(Math.abs(distanceKmOn(table, on(2026, 10, 3)) - 1.74364001 * AU_KM) < 1);
});

test('表の範囲外や、壊れた表では距離を出さない', () => {
  assert.equal(distanceKmOn(table, on(2025, 12, 31)), null);
  assert.equal(distanceKmOn(table, on(2031, 1, 1)), null);
  assert.equal(distanceKmOn(null, on(2026, 9, 29)), null);
  assert.equal(distanceKmOn({unit: 'km', startDate: '2026-01-01', values: [1]}, on(2026, 1, 1)), null);
});

test('距離は日本語の「約○億km」「約○万km」で出す', () => {
  assert.equal(formatDistanceJa(267_000_000), '約2.7億km');
  assert.equal(formatDistanceJa(56_250_000), '約5,625万km');
  assert.equal(distanceMessage(267_000_000), 'いま、イトカワは地球から約2.7億km。光でも約15分かかる距離です。');
  assert.equal(distanceMessage(null), '');
});

test('光で何分かかるかを出す（約2.7億kmなら約15分、近くても1分より短くしない）', () => {
  assert.equal(lightMinutes(267_000_000), 15);
  assert.equal(lightMinutes(1_000), 1);
  assert.equal(lightMinutes(null), null);
});
