import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ART_LIMIT, ART_TEXT_MAX, acceptArt, buildPrompt, parseArt, sceneOf} from '../app/api/art/rules.mjs';

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

test('一人称の文は、場面の言葉だけにする（文字として描かれないように）', () => {
  assert.equal(sceneOf('I want to go into space.'), 'go into space');
  assert.equal(sceneOf("I'd like to live in a town near the sea"), "I'd like to live in a town near the sea".replace(/^I'd like to /, ''));
  assert.equal(sceneOf('Playing the piano again.'), 'Playing the piano again');
});

test('画風は固定。説明の言葉（AI が文字として描いてしまう）は入れない', () => {
  const prompt = buildPrompt('I want to go into space.');
  assert.match(prompt, /^A small person, go into space\. /);
  assert.match(prompt, /black and white/i);
  assert.doesNotMatch(prompt, /receipt|print|wish|text|letter|I want/i);
});
