import assert from 'node:assert/strict';
import {test} from 'node:test';
import {certificateContent} from '../public/certificate.js';

const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime();
const wish = {id: 'w1', text: '海を見に行く', status: 'returned', createdAt: at(2026, 9, 1, 23)};

test('預けた日・帰った日・旅した日数を暦の日付で出す', () => {
  const content = certificateContent({wish, now: at(2026, 10, 3, 1)});
  assert.deepEqual(content.lines, [
    {label: '預けた日', value: '2026年9月1日'},
    {label: '帰った日', value: '2026年10月3日'},
    {label: '旅した日数', value: '32日'},
  ]);
  assert.equal(content.fileName, 'morune-25143-2026-10-03.png');
});

test('願いの言葉は、選んだときだけ入れる（初期値は入れない）', () => {
  assert.equal(certificateContent({wish, now: at(2026, 10, 3)}).wishText, '');
  assert.equal(certificateContent({wish, now: at(2026, 10, 3), includeText: true}).wishText, '海を見に行く');
});

test('公式の命名だと誤解させない一文を必ず入れる', () => {
  assert.match(certificateContent({wish, now: at(2026, 10, 3)}).footnote, /作品 MORUNE 25143 の中の記録/);
});

test('みんなの星の番号（枝番）は、発行されているときだけ入れる', () => {
  assert.equal(certificateContent({wish, now: at(2026, 10, 3)}).lines.length, 3);
  const lines = certificateContent({wish, now: at(2026, 10, 3), number: '25143-0001'}).lines;
  assert.deepEqual(lines.at(-1), {label: 'あなたの番号', value: '25143-0001'});
});
