// 印刷用の帰還票（感熱紙 80mm）。イベントの感熱プリンターで、その場で出して手渡すための画像。
// 画像は端末の中で描くだけ。願いの言葉はサーバーへ送らない。
// ここには描く内容を決める純粋な関数だけを置き、node --test で確かめる（描くのは mission.js）。
// 紙と商品には「25143」・星・MORUNE だけを入れる（docs/権利の確認.md）。

// 80mm ロールの印字幅 72mm、203dpi で 576 ドット
export const RECEIPT_WIDTH = 576;

// 絵はガチャで決まる。キーワードの絵ができるまでは星の絵。ふつう3種類＋レア1種類（およそ10回に1回）
export const RECEIPT_VARIANTS = Object.freeze([
  {id: 'dusk', name: '夕方の一番星', rare: false},
  {id: 'night', name: '満天の星', rare: false},
  {id: 'dawn', name: '夜明け', rare: false},
  {id: 'meteor', name: '流れ星', rare: true},
]);

function hash(text) {
  let value = 2166136261;
  for (const char of String(text)) {
    value ^= char.codePointAt(0);
    value = Math.imul(value, 16777619) >>> 0;
  }
  return value;
}

// どの絵が出るかは願いごとに決まる（何度保存しても同じ絵。印刷し直しても変わらない）
export function receiptVariant(wishId) {
  const value = hash(wishId);
  if (value % 10 === 0) return RECEIPT_VARIANTS[3];
  return RECEIPT_VARIANTS[Math.floor(value / 10) % 3];
}

function formatDate(time) {
  const date = new Date(time);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

// 願いの言葉を入れるかは本人が選ぶ（「願いの言葉も入れる」。紙の主役なので初期値は入れる。2026-10-07 変更）
export function returnReceiptContent({wish, now, distanceText = '', number = null, includeText = false, qrUrl = ''}) {
  const firstStep = typeof wish.firstStep === 'string' ? wish.firstStep.trim() : '';
  const variant = receiptVariant(wish.id);
  // 預けた日 → 帰ってきた日。同じ日なら1つだけ（旅の長さが、紙を見ただけで分かるように）
  const deposited = Number.isFinite(wish.createdAt) && wish.createdAt > 0 ? formatDate(wish.createdAt) : '';
  // 印刷し直した日ではなく帰還した日を使う。時刻のない古い願いは、最後に判断した日で代用する。
  const returnedAt = Number.isFinite(wish.returnedAt) ? wish.returnedAt : Number.isFinite(wish.updatedAt) ? wish.updatedAt : now;
  const returned = formatDate(returnedAt);
  const meta = [deposited && deposited !== returned ? `${deposited} → ${returned}` : returned];
  if (distanceText) meta.push(`25143まで ${distanceText}`);
  // 紙の文字は最小限にする（2026-10-07、本人の判断：文字が多くてごちゃごちゃする）。
  // 載せるのは、番号・絵・（選んだときだけ）願いの言葉・日付と距離・QR・最初の一歩だけ
  return {
    variant,
    wishText: includeText ? wish.text : '',
    meta,
    number,
    // 読み取ると、自分の星（このアプリ）へ。紙を財布に入れておけば、また開くきっかけになる
    qrUrl,
    stub: '最初の小さな一歩',
    // アプリで書いた一歩があれば印刷する。なければペンで書く線を残す（記録はアプリ、紙は目に入る場所に置くメモ）
    firstStep,
    // 距離の出典だけは残す
    source: distanceText ? '距離：NASA/JPL Horizons' : '',
    fileName: `morune-25143-receipt-${new Date(now).toLocaleDateString('sv-SE')}.png`,
  };
}
