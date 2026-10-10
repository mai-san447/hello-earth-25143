import assert from 'node:assert/strict';
import {test} from 'node:test';
import {RECEIPT_VARIANTS, RECEIPT_WIDTH, observationLine, receiptVariant, returnReceiptContent} from '../public/receipt.js';
import {createWish, markReturned, decide, setFirstStep, recordStep, markFulfilled} from '../public/wish-state.js';

const wish = {id: '6f1c2a0e-1111-4222-8333-444455556666', text: '宇宙に行きたい', createdAt: new Date(2026, 7, 22, 21).getTime()};
const now = new Date(2026, 9, 7, 10).getTime();

test('後日つくり直しても帰還日が変わらない（一歩・叶ったの記録後も同じ）', () => {
  const later = now + 7 * 86400000;
  const returned = markReturned(createWish({id: wish.id, text: wish.text, now: wish.createdAt}), now);
  const received = decide(returned, 'try', later);
  const grown = markFulfilled(recordStep(setFirstStep(received, '見学する'), later), later);
  assert.equal(received.returnedAt, now);
  assert.equal(grown.returnedAt, now);
  for (const item of [returned, received, grown]) {
    assert.deepEqual(returnReceiptContent({wish: item, now: later}).meta, ['2026.08.22 → 2026.10.07']);
  }
});

test('古い願いの帰還日は updatedAt で代用し、時刻がなければ今日を使う', () => {
  assert.deepEqual(returnReceiptContent({wish: {...wish, updatedAt: now}, now: now + 86400000}).meta, ['2026.08.22 → 2026.10.07']);
  const received = decide({...wish, status: 'returned', updatedAt: now}, 'try', now + 86400000);
  assert.equal(received.returnedAt, now);
  assert.deepEqual(returnReceiptContent({wish: {...wish, returnedAt: NaN, updatedAt: null}, now}).meta, ['2026.08.22 → 2026.10.07']);
});

test('もう少し預けて再帰還した場合は、その帰還日時を保存する', () => {
  const returned = markReturned(createWish({id: wish.id, text: wish.text, now: wish.createdAt}), now);
  const again = markReturned(decide(returned, 'later', now), now + 86400000);
  assert.deepEqual(returnReceiptContent({wish: again, now: now + 7 * 86400000}).meta, ['2026.08.22 → 2026.10.08']);
});

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
  assert.match(content.source, /距離：NASA\/JPL Horizons/);
  assert.match(content.source, /本物の星の名前ではありません/);
  assert.doesNotMatch(JSON.stringify(content), /はやぶさ|HAYABUSA|イトカワ|ITOKAWA|JAXA/);
});

test('距離がないときは書かない', () => {
  const content = returnReceiptContent({wish: {...wish, createdAt: now - 3600000}, now, days: 0});
  assert.deepEqual(content.meta, ['2026.10.07']);
  assert.equal(content.source, '番号は作品の中だけのもので、本物の星の名前ではありません');
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

test('観測の記録：場所（小数1桁）・帰ってきた日時・絵柄・番号を1行に。帰ってきたときの場所を優先する', () => {
  const time = new Date(2026, 9, 11, 21, 30).getTime();
  assert.equal(observationLine({observer: {lat: 35.68, lon: 139.76}, time, variant: {name: '夕方の一番星'}, serial: 412}), '観測 35.7°N 139.8°E 2026.10.11 21:30 ／ 夕方の一番星 No.0412');
  assert.equal(observationLine({observer: {lat: -33.87, lon: -70.6}, time, variant: {name: '流れ星'}, serial: 7}), '観測 33.9°S 70.6°W 2026.10.11 21:30 ／ 流れ星 No.0007');
  assert.equal(observationLine({observer: null, time, variant: {name: '夜明け'}, serial: 1}), '観測 2026.10.11 21:30 ／ 夜明け No.0001');
  const content = returnReceiptContent({wish: {...wish, returnedAt: time, observedAt: {lat: 43.06, lon: 141.36}}, now, observer: {lat: 35.68, lon: 139.76}});
  assert.match(content.observation, /^観測 43\.1°N 141\.4°E 2026\.10\.11 21:30 ／ /);
  // 何度つくっても同じ（番号は願いごとに決まる）
  assert.equal(returnReceiptContent({wish: {...wish, returnedAt: time}, now, observer: {lat: 1, lon: 1}}).observation, returnReceiptContent({wish: {...wish, returnedAt: time}, now: now + 99999, observer: {lat: 1, lon: 1}}).observation);
});
