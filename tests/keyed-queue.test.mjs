import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createKeyedQueue} from '../public/keyed-queue.js';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

test('同じ願いへの保存は、押した順に1つずつ、最新のデータから行う', async () => {
  const queue = createKeyedQueue();
  let saved = {firstStep: '', steps: 0};
  // 遅い保存：読んでから書くまでの間に、次の操作が来る
  const update = change => queue.run('a', async () => {
    const next = change({...saved});
    await wait(20);
    saved = next;
  });
  const writing = update(wish => ({...wish, firstStep: '地図で町を選ぶ'}));
  const stepping = update(wish => ({...wish, steps: wish.steps + 1}));
  await Promise.all([writing, stepping]);
  assert.deepEqual(saved, {firstStep: '地図で町を選ぶ', steps: 1});
});

test('前の保存が失敗しても、次の保存は行い、失敗は呼んだ側に返す', async () => {
  const queue = createKeyedQueue();
  const order = [];
  const failed = queue.run('a', async () => { order.push(1); throw new Error('保存できません'); });
  const next = queue.run('a', async () => { order.push(2); return 'ok'; });
  await assert.rejects(failed, /保存できません/);
  assert.equal(await next, 'ok');
  assert.deepEqual(order, [1, 2]);
});

test('違う願いの保存は待ち合わせない。終われば busy でなくなる', async () => {
  const queue = createKeyedQueue();
  const order = [];
  const slow = queue.run('a', async () => { await wait(30); order.push('a'); });
  const fast = queue.run('b', async () => { order.push('b'); });
  assert.equal(queue.busy('a'), true);
  await Promise.all([slow, fast]);
  assert.deepEqual(order, ['b', 'a']);
  await wait(0);
  assert.equal(queue.busy('a'), false);
});
