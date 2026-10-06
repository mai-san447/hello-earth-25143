import assert from 'node:assert/strict';
import {test} from 'node:test';
import {brightness, signalMessage, signalsWhileWaiting} from '../public/constellation.js';


test('信号は、願いが軌道で待っていたあいだに届いた分だけ数える', () => {
  const waiting = {id: 'a', text: '海', status: 'waiting', createdAt: 100, updatedAt: 100};
  const received = {id: 'b', text: '山', status: 'doing', createdAt: 100, updatedAt: 200};
  const times = [50, 120, 180, 250];
  assert.equal(signalsWhileWaiting(waiting, times, 300), 3);
  assert.equal(signalsWhileWaiting(received, times, 300), 2);
  assert.equal(signalsWhileWaiting(waiting, null, 300), 0);
});

test('信号が届くほど明るくなるが、眩しくなりすぎない', () => {
  assert.equal(brightness(0), 1);
  assert.ok(brightness(3) > brightness(1));
  assert.equal(brightness(100000), 2.2);
  assert.equal(signalMessage(0), '');
  assert.equal(signalMessage(23), '預けているあいだに、23回の信号が届いていました。');
});
