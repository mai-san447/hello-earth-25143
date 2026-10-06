import assert from 'node:assert/strict';
import {test} from 'node:test';
import {RECEIPT_VARIANTS, RECEIPT_WIDTH, receiptVariant, returnReceiptContent} from '../public/receipt.js';

const wish = {id: '6f1c2a0e-1111-4222-8333-444455556666', text: '宇宙に行きたい', createdAt: 0};
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

test('待っていた日数・信号・距離・番号を入れる。はやぶさ・イトカワの名前は入れない', () => {
  const content = returnReceiptContent({wish, now, days: 46, signals: 12, distanceText: '約2.6億km', number: '25143-0000-03', includeText: true});
  assert.equal(content.welcome, 'おかえりなさい。46日の旅でした');
  assert.deepEqual(content.meta, ['2026.10.07', '信号 12回', '25143まで 約2.6億km']);
  assert.equal(content.number, '25143-0000-03');
  assert.match(content.fine.join(''), /NASA\/JPL Horizons/);
  assert.match(content.fine.join(''), /本物の星や小惑星の名前ではありません/);
  assert.doesNotMatch(JSON.stringify(content), /はやぶさ|HAYABUSA|イトカワ|ITOKAWA|JAXA/);
});

test('信号がないときは書かない。今日帰ってきた願いの言い方', () => {
  const content = returnReceiptContent({wish, now, days: 0});
  assert.deepEqual(content.meta, ['2026.10.07']);
  assert.equal(content.welcome, 'おかえりなさい。今日の旅でした');
});

test('QR は、渡したときだけ入れる（読み取ると自分の星へ）', () => {
  assert.equal(returnReceiptContent({wish, now, days: 1}).qrUrl, '');
  const content = returnReceiptContent({wish, now, days: 1, qrUrl: 'https://morune-25143.morune-25143.workers.dev/'});
  assert.equal(content.qrUrl, 'https://morune-25143.morune-25143.workers.dev/');
  assert.equal(content.qrLabel, 'あなたの星へ');
});

test('アプリで書いた最初の一歩があれば、紙に載せる', () => {
  assert.equal(returnReceiptContent({wish, now, days: 1}).firstStep, '');
  const content = returnReceiptContent({wish: {...wish, firstStep: ' 天文台の見学に申し込む '}, now, days: 1});
  assert.equal(content.firstStep, '天文台の見学に申し込む');
  assert.match(content.stubHint, /QR/);
});

test('AI でつくった願いの絵があれば、星の絵のかわりに使う', () => {
  assert.equal(returnReceiptContent({wish, now, days: 1}).art, '');
  const content = returnReceiptContent({wish: {...wish, art: 'data:image/png;base64,AAA'}, now, days: 1});
  assert.equal(content.art, 'data:image/png;base64,AAA');
  assert.equal(content.drawLabel, '願いの絵');
});
