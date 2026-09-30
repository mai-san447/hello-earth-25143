import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
  CAUTION_WORDS, DAILY_LIMIT, MAX_LENGTH, REPORT_HIDE_THRESHOLD, SKY_LIMIT, TTL_MS,
  acceptPublish, expiresAt, formatNumber, isShowable, isStarId, normalizeText, parsePublish,
  parseReport, parseStarSignal, publicStar, screenText, statusAfterReport,
} from '../app/api/stars/rules.mjs';

const orbitId = '3f2b8c1e-9a4d-4b7e-8c21-5d6e7f809a1b';
const otherOrbit = '7a1c2d3e-4f50-4a6b-9c7d-8e9f0a1b2c3d';
const starId = 'c0ffee00-1234-4abc-8def-0123456789ab';
const DAY = 24 * 60 * 60 * 1000;

test('決めた数：60字・40字、1日3つ、30日と24時間、12個、通報3件', () => {
  assert.deepEqual({...MAX_LENGTH}, {wish: 60, fulfilled: 40});
  assert.deepEqual({...DAILY_LIMIT}, {wish: 3, fulfilled: 3});
  assert.equal(TTL_MS.wish, 30 * DAY);
  assert.equal(TTL_MS.fulfilled, DAY);
  assert.equal(SKY_LIMIT, 12);
  assert.equal(REPORT_HIDE_THRESHOLD, 3);
});

test('ふつうの願いは、そのまま表示する', () => {
  for (const text of [
    '退院したら海を見に行きたい',
    '家族とラーメンを食べる',
    '少しねむりたい',
    'インスタントラーメンを食べたい',
    '好きなものばかり食べる日',
    '近くの病院の中庭を散歩する',
    'Wi-Fi のある休憩室で映画を観る',
    '2026年のうちに100km歩く',
    'DMMで映画を観る',
  ]) {
    assert.deepEqual(screenText(text), {status: 'visible', reason: null}, text);
  }
});

test('URL・メールアドレスは保留にする（全角でも見つける）', () => {
  assert.equal(screenText('ここを見て https://example.com').reason, 'url');
  assert.equal(screenText('www.example.jp を見て').reason, 'url');
  assert.equal(screenText('example.com で待ってる').reason, 'url');
  assert.equal(screenText('ｈｔｔｐｓ：／／ｅｘａｍｐｌｅ．ｃｏｍ').reason, 'url');
  assert.equal(screenText('連絡は abc.def@example.co.jp まで').reason, 'email');
  assert.equal(screenText('ａｂｃ＠ｅｘａｍｐｌｅ．ｊｐ').status, 'held');
});

test('電話番号らしい数字の並び（10けた以上、ハイフン・空白・かっこ入り）は保留にする', () => {
  for (const text of ['090-1234-5678', '09012345678', '０９０ー１２３４ー５６７８', '(03) 1234 5678', '電話は 03.1234.5678']) {
    assert.equal(screenText(text).reason, 'phone', text);
  }
  // 日付や短い数字は電話番号ではない
  assert.equal(screenText('2026-10-07 までに 3 冊読む').status, 'visible');
  assert.equal(screenText('123456789').status, 'visible');
});

test('登録した注意語と病院名らしい並びは保留にする', () => {
  assert.equal(screenText('あいつ死ね').reason, 'word');
  assert.equal(screenText('もう死にたい').reason, 'word');
  assert.equal(screenText('LINE ID 教えて').reason, 'word');
  assert.equal(screenText('ｌｉｎｅ ｉｄ おしえて').reason, 'word');
  assert.equal(screenText('気軽にDMしてね').reason, 'word');
  assert.equal(screenText('聖路加病院の先生にお礼を言う').reason, 'hospital');
  assert.equal(screenText('サクラクリニックにまた行く').reason, 'hospital');
  // 注意語はすべて、それだけで保留になる
  for (const word of CAUTION_WORDS) assert.equal(screenText(`今日は ${word} です`).status, 'held', word);
});

test('言葉は前後の空白・改行・見えない文字を整える', () => {
  assert.equal(normalizeText('  海へ\n\n行く​ '), '海へ 行く');
  assert.equal(normalizeText('\t'), '');
});

test('公開の形を確かめる（null や配列でも 500 にしない）', () => {
  for (const body of [null, undefined, 42, 'text', [], {}, {orbitId}, {orbitId, kind: 'wish'}]) {
    const result = parsePublish(body);
    assert.equal(result.ok, false, JSON.stringify(body));
    assert.equal(result.status, 400);
  }
  assert.equal(parsePublish({orbitId: 'x', kind: 'wish', text: '海'}).status, 400);
  assert.equal(parsePublish({orbitId, kind: 'reply', text: '海'}).status, 400);
  assert.equal(parsePublish({orbitId, kind: 'wish', text: 5}).status, 400);
  assert.equal(parsePublish({orbitId, kind: 'wish', text: '   '}).status, 400);
  assert.deepEqual(parsePublish({orbitId, kind: 'wish', text: ' 海へ行く ', name: '無視される'}), {ok: true, value: {orbitId, kind: 'wish', text: '海へ行く'}});
});

test('文字数：願いは60字、叶ったよは40字まで（絵文字も1字）', () => {
  assert.equal(parsePublish({orbitId, kind: 'wish', text: 'あ'.repeat(60)}).ok, true);
  assert.equal(parsePublish({orbitId, kind: 'wish', text: 'あ'.repeat(61)}).status, 400);
  assert.equal(parsePublish({orbitId, kind: 'fulfilled', text: 'あ'.repeat(40)}).ok, true);
  assert.equal(parsePublish({orbitId, kind: 'fulfilled', text: 'あ'.repeat(41)}).status, 400);
  assert.equal(parsePublish({orbitId, kind: 'fulfilled', text: '🌠'.repeat(40)}).ok, true);
});

test('1つの軌道から、願いも叶ったよも1日3つまで', () => {
  for (const kind of ['wish', 'fulfilled']) {
    assert.deepEqual(acceptPublish({kind, dailyCount: 0}), {ok: true});
    assert.deepEqual(acceptPublish({kind, dailyCount: 2}), {ok: true});
    assert.equal(acceptPublish({kind, dailyCount: 3}).status, 429);
  }
});

test('有効期限：願いは30日後、叶ったよは24時間後', () => {
  const now = Date.UTC(2026, 8, 30);
  assert.equal(expiresAt('wish', now), now + 30 * DAY);
  assert.equal(expiresAt('fulfilled', now), now + DAY);
});

test('星空に出すのは、表示中・期限内・自分以外の星だけ', () => {
  const now = 1000;
  const star = {status: 'visible', expiresAt: 2000, orbitId: otherOrbit};
  assert.equal(isShowable(star, {now, ownOrbitId: orbitId}), true);
  assert.equal(isShowable(star, {now: 2000, ownOrbitId: orbitId}), false, '期限ちょうどは出さない');
  assert.equal(isShowable({...star, status: 'held'}, {now}), false);
  assert.equal(isShowable({...star, status: 'hidden'}, {now}), false);
  assert.equal(isShowable({...star, orbitId}, {now, ownOrbitId: orbitId}), false);
});

test('通報は3件で非表示。保留と非表示はそのまま', () => {
  assert.equal(statusAfterReport({status: 'visible', reports: 1}), 'visible');
  assert.equal(statusAfterReport({status: 'visible', reports: 2}), 'visible');
  assert.equal(statusAfterReport({status: 'visible', reports: 3}), 'hidden');
  assert.equal(statusAfterReport({status: 'held', reports: 5}), 'held');
  assert.equal(statusAfterReport({status: 'hidden', reports: 1}), 'hidden');
});

test('通報と信号の形を確かめる（null でも 400）', () => {
  assert.equal(isStarId(starId), true);
  assert.equal(isStarId(`${starId}'--`), false);
  for (const body of [null, 1, [], {}, {starId}, {reporterOrbitId: orbitId}, {starId: 'x', reporterOrbitId: orbitId}]) {
    assert.equal(parseReport(body).status, 400, JSON.stringify(body));
  }
  assert.deepEqual(parseReport({starId, reporterOrbitId: orbitId}), {ok: true, value: {starId, reporterOrbitId: orbitId}});
  assert.equal(parseStarSignal(null).status, 400);
  assert.equal(parseStarSignal({starId: 'x'}).status, 400);
  assert.deepEqual(parseStarSignal({starId}), {ok: true, value: {starId}});
});

test('枝番は 25143-0001 の形。この作品の中だけの番号', () => {
  assert.equal(formatNumber(1), '25143-0001');
  assert.equal(formatNumber(312), '25143-0312');
  assert.equal(formatNumber(12345), '25143-12345');
  assert.equal(formatNumber(0), null);
  assert.equal(formatNumber(null), null);
});

test('返す星には、軌道ID・状態・通報数を含めない', () => {
  const row = {id: starId, orbitId, kind: 'wish', text: '海', status: 'visible', reports: 2, createdAt: 1, expiresAt: 2};
  assert.deepEqual(publicStar(row), {id: starId, kind: 'wish', text: '海', expiresAt: 2});
});
