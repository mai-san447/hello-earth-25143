import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isOrbitId} from '../app/api/signals/rules.mjs';

// 信号は廃止したため、残る共通の軌道ID検証だけを確かめる。
test('軌道IDはUUID v4だけを受け付ける', () => {
  assert.equal(isOrbitId('3f2b8c1e-9a4d-4b7e-8c21-5d6e7f809a1b'), true);
  for (const value of [null, undefined, 1, [], '', 'x', "3f2b8c1e-9a4d-4b7e-8c21-5d6e7f809a1b'--", '3f2b8c1e-9a4d-1b7e-8c21-5d6e7f809a1b']) assert.equal(isOrbitId(value), false);
});
