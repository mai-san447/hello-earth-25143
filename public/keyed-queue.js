// 同じ願いへの保存を、押した順に1つずつ実行する。
// 「最初の一歩」を書いた直後に「一歩ふみ出した」を押すと、2つの保存が重なり、
// 古いデータから作った後の保存が、先の内容を消してしまう（2026-10-05 Codex レビュー）。
// task は順番が来たときに呼ばれるので、その時点の最新のデータから次のデータを作れる。
export function createKeyedQueue() {
  const tails = new Map();
  return {
    run(key, task) {
      const previous = tails.get(key) ?? Promise.resolve();
      // 前の保存が失敗しても、次の保存は止めない（失敗は呼び出し側が受け取る）
      const result = previous.then(() => task());
      const tail = result.catch(() => {});
      tails.set(key, tail);
      tail.then(() => { if (tails.get(key) === tail) tails.delete(key); });
      return result;
    },
    busy(key) {
      return tails.has(key);
    },
  };
}
