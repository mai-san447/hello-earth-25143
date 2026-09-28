import assert from 'node:assert/strict';
import {test} from 'node:test';
import {bigrams, brightness, constellationEdges, receivedWishes, signalMessage, signalsWhileWaiting, similarity} from '../public/constellation.js';

const wish = (id, text, status = 'doing', createdAt = Number(id.replace(/\D/g, '')) || 1) => ({id, text, status, createdAt, updatedAt: createdAt + 100});

test('星座に入るのは受け取った願い（想いを受け取る・アーカイブに保存）だけ', () => {
  const wishes = [wish('w1', '海'), wish('w2', '山', 'done'), wish('w3', '空', 'waiting'), wish('w4', '川', 'returned')];
  assert.deepEqual(receivedWishes(wishes).map(item => item.id), ['w1', 'w2']);
});

test('言葉の近さは2文字ずつの重なりで測る', () => {
  assert.deepEqual([...bigrams('海に行く')], ['海に', 'に行', '行く']);
  assert.equal(similarity('朝の海を歩きたい', '朝の海を歩きたい'), 1);
  assert.equal(similarity('朝の海を歩きたい', 'ラーメンを食べる'), 0);
  assert.ok(similarity('朝の海を歩きたい', '夜の海を歩く') > similarity('朝の海を歩きたい', '山に登る'));
});

test('星は全部つながり、線の数は星の数より1つ少ない', () => {
  const wishes = ['w1 朝の海を歩きたい', 'w2 夜の海を歩く', 'w3 山に登りたい', 'w4 富士山に登る', 'w5 ラーメンを食べる'].map(line => {
    const [id, text] = line.split(' ');
    return wish(id, text);
  });
  const edges = constellationEdges(wishes);
  assert.equal(edges.length, 4);
  const linked = new Set(edges.flatMap(edge => [edge.from, edge.to]));
  assert.equal(linked.size, 5);
});

test('言葉の近い願いどうしが直接つながる', () => {
  const wishes = [wish('w1', '朝の海を歩きたい'), wish('w2', '山に登りたい'), wish('w3', '夜の海を歩く'), wish('w4', '富士山に登る')];
  const pairs = constellationEdges(wishes).map(edge => [edge.from, edge.to].sort().join('-'));
  assert.ok(pairs.includes('w1-w3'));
  assert.ok(pairs.includes('w2-w4'));
});

test('同じ願いなら、何度計算しても同じ星座になる', () => {
  const wishes = [wish('w1', 'a'), wish('w2', 'b'), wish('w3', 'c')];
  assert.deepEqual(constellationEdges(wishes), constellationEdges([...wishes].reverse()));
  assert.deepEqual(constellationEdges([wish('w1', '海')]), []);
});

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
