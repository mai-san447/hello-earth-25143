// 帰還証明書（#26）。NASA の搭乗券や JAXA の探査18きっぷのように、持ち帰れる記念を渡す。
// 画像は端末の中で描いて保存するだけ。願いの言葉はサーバーへ送らない。
// ここには描く内容を決める純粋な関数だけを置き、node --test で確かめる。

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(time) {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function formatDateJa(time) {
  const date = new Date(time);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

// 願いの言葉を入れるかは本人が選ぶ（初期値は入れない）。しばらく離れている人の願いは個人的な内容になりやすいため。
// number は願いの番号（25143-0007-03 など）。人の番号がまだ発行されていなければ入れない
export function certificateContent({wish, now, includeText = false, distanceLine = '', number = null}) {
  const days = Math.max(0, Math.round((startOfLocalDay(now) - startOfLocalDay(wish.createdAt)) / DAY_MS));
  const lines = [
    {label: '預けた日', value: formatDateJa(wish.createdAt)},
    {label: '帰った日', value: formatDateJa(now)},
    {label: '旅した日数', value: `${days}日`},
  ];
  if (number) lines.push({label: '願いの番号', value: number});
  return {
    title: '帰還証明書',
    kicker: 'WISH STAR / RETURNED — 25143',
    lines,
    wishText: includeText ? wish.text : '',
    distanceLine,
    // 「星に公式の名前が付く」と誤解させないための一文（星の命名の販売の失敗から）
    footnote: 'この証明書は作品 MORUNE 25143 の中の記録です。',
    // 権利の確認（docs/権利の確認.md）：枝番が本物の天体名と誤解されないこと、距離の出典を書くこと
    credit: distanceLine
      ? '本物の星や小惑星の名前ではありません。距離：NASA/JPL Horizons'
      : '本物の星や小惑星の名前ではありません。',
    fileName: `morune-25143-${new Date(now).toLocaleDateString('sv-SE')}.png`,
  };
}
