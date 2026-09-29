import assert from 'node:assert/strict';
import {test} from 'node:test';
import {BURST_LIMIT, DAILY_LIMIT, RETENTION_MS, acceptSignal, isOrbitId} from '../app/api/signals/rules.mjs';

const orbitId = '3f2b8c1e-9a4d-4b7e-8c21-5d6e7f809a1b';

test('送り先はランダムなUUIDの軌道IDだけを受け付ける', () => {
  assert.equal(isOrbitId(orbitId), true);
  assert.equal(isOrbitId('abc'), false);
  assert.equal(isOrbitId(undefined), false);
  assert.equal(isOrbitId(`${orbitId}' OR 1=1`), false);
});

test('1分間に一定数を超える信号は、いたずら防止のため受け付けない', () => {
  assert.deepEqual(acceptSignal({orbitId, recentCount: 0}), {ok: true});
  assert.deepEqual(acceptSignal({orbitId, recentCount: BURST_LIMIT - 1}), {ok: true});
  assert.equal(acceptSignal({orbitId, recentCount: BURST_LIMIT}).status, 429);
  assert.equal(acceptSignal({orbitId: 'x', recentCount: 0}).status, 400);
});

test('1つの星へは1日100回まで', () => {
  assert.deepEqual(acceptSignal({orbitId, recentCount: 0, dailyCount: DAILY_LIMIT - 1}), {ok: true});
  assert.equal(acceptSignal({orbitId, recentCount: 0, dailyCount: DAILY_LIMIT}).status, 429);
  assert.equal(RETENTION_MS, 365 * 24 * 60 * 60 * 1000);
});

