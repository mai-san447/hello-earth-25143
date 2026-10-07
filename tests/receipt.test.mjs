import assert from 'node:assert/strict';
import {test} from 'node:test';
import {RECEIPT_VARIANTS, RECEIPT_WIDTH, receiptVariant, returnReceiptContent} from '../public/receipt.js';

const wish = {id: '6f1c2a0e-1111-4222-8333-444455556666', text: '宇宙に行きたい', createdAt: new Date(2026, 7, 22, 21).getTime()};
const now = new Date(2026, 9, 7, 10).getTime();

test('印字幅は 80mm ロールの 576 ドット', () => {
  assert.equal(RECEIPT_WIDTH, 576);
});

test('絵は願いごとに決まり、何度保存しても同じ', () => {
  assert.equal(receiptVariant(wish.id), receiptVariant(wish.id));
});

test('ふつうの絵3種類とレアがどれも出て、レアは少ない', () => {
  const counts = new Map(RECEIPT_VARIANTS.map(variant => [variant.id, 0]));
  for (let index = 0; index < 2000; index += 1) {
    const variant = receiptVariant(`wish-${index}`);
    counts.set(variant.id, counts.get(variant.id) + 1);
  }
  for (const variant of RECEIPT_VARIANTS) assert.ok(counts.get(variant.id) > 0, variant.id);
  assert.ok(counts.get('meteor') < counts.get('night'));
  assert.ok(counts.get('meteor') / 2000 < 0.2);
});

test('願いの言葉は、選んだときだけ入れる', () => {
  assert.equal(returnReceiptContent({wish, now, days: 3}).wishText, '');
  assert.equal(returnReceiptContent({wish, now, days: 3, includeText: true}).wishText, '宇宙に行きたい');
});

test('距離・番号を入れる。はやぶさ・イトカワの名前は入れない', () => {
  const content = returnReceiptContent({wish, now, days: 46, distanceText: '約2.6億km', number: '25143-0000-03', includeText: true});
  assert.deepEqual(content.meta, ['2026.08.22 → 2026.10.07', '25143まで 約2.6億km']);
  assert.equal(content.number, '25143-0000-03');
  assert.equal(content.source, '距離：NASA/JPL Horizons');
  assert.doesNotMatch(JSON.stringify(content), /はやぶさ|HAYABUSA|イトカワ|ITOKAWA|JAXA/);
});

test('距離がないときは書かない', () => {
  const content = returnReceiptContent({wish: {...wish, createdAt: now - 3600000}, now, days: 0});
  assert.deepEqual(content.meta, ['2026.10.07']);
  assert.equal(content.source, '');
});

test('QR は、渡したときだけ入れる（読み取ると自分の星へ）', () => {
  assert.equal(returnReceiptContent({wish, now, days: 1}).qrUrl, '');
  const content = returnReceiptContent({wish, now, days: 1, qrUrl: 'https://morune-25143.morune-25143.workers.dev/'});
  assert.equal(content.qrUrl, 'https://morune-25143.morune-25143.workers.dev/');
});

test('アプリで書いた最初の一歩があれば、紙に載せる', () => {
  assert.equal(returnReceiptContent({wish, now, days: 1}).firstStep, '');
  const content = returnReceiptContent({wish: {...wish, firstStep: ' 天文台の見学に申し込む '}, now, days: 1});
  assert.equal(content.firstStep, '天文台の見学に申し込む');
});

test('絵は星のドット絵だけ（AI の絵が保存されていても使わない）', () => {
  const content = returnReceiptContent({wish: {...wish, art: 'data:image/png;base64,AAA'}, now, days: 1});
  assert.equal('art' in content, false);
  assert.ok(RECEIPT_VARIANTS.includes(content.variant));
});

test('紙の文字は最小限（あいさつ・説明の文は入れない）', () => {
  const text = JSON.stringify(returnReceiptContent({wish, now, days: 3, qrUrl: 'https://example.com/'}));
  assert.doesNotMatch(text, /おかえりなさい|読み取ると|見えるところに|いつか消えます/);
});
