import assert from 'node:assert/strict';
import {test} from 'node:test';
import {qrcode} from '../public/vendor/qrcode.mjs';

test('同梱した QR の部品で、アプリの URL の QR を作れる', () => {
  const qr = qrcode(0, 'M');
  qr.addData('https://morune-25143.morune-25143.workers.dev/');
  qr.make();
  assert.ok(qr.getModuleCount() >= 21);
  assert.equal(typeof qr.isDark(0, 0), 'boolean');
  // 左上の位置合わせの模様は黒
  assert.equal(qr.isDark(0, 0), true);
});
