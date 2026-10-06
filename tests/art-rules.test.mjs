import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ART_LIMIT, ART_TEXT_MAX, acceptArt, buildPrompt, parseArt} from '../app/api/art/rules.mjs';

const orbitId = '80e68463-d1fb-46cd-984f-a6cb7d8a863a';

test('軌道ID と、60字までの願いの言葉だけを受け付ける', () => {
  assert.deepEqual(parseArt({orbitId, text: ' 宇宙に行きたい '}), {ok: true, value: {orbitId, text: '宇宙に行きたい'}});
  assert.equal(parseArt({orbitId: 'x', text: '海'}).ok, false);
  assert.equal(parseArt({orbitId, text: '  '}).ok, false);
  assert.equal(parseArt({orbitId, text: 'あ'.repeat(ART_TEXT_MAX + 1)}).ok, false);
});

test('1人1日5回、全体1日300回まで', () => {
  assert.equal(acceptArt({orbitCount: 0, globalCount: 0}).ok, true);
  assert.equal(acceptArt({orbitCount: ART_LIMIT.perOrbitDaily, globalCount: 0}).status, 429);
  assert.equal(acceptArt({orbitCount: 0, globalCount: ART_LIMIT.globalDaily}).status, 429);
  assert.equal(acceptArt({orbitCount: undefined, globalCount: 0}).ok, false);
});

test('画風は固定し、願いの中身だけを入れる。文字・ロゴ・宗教の印は描かせない', () => {
  const prompt = buildPrompt('I want to go to space');
  assert.match(prompt, /this wish coming true: I want to go to space\./);
  assert.doesNotMatch(prompt, /receipt|print/i);
  assert.match(prompt, /black and white/i);
  assert.match(prompt, /No text/);
  assert.match(prompt, /no religious symbols/);
});
