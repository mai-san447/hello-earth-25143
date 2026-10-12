// 印刷用の帰還票（感熱紙 80mm）。イベントの感熱プリンターで、その場で出して手渡すための画像。
// 画像は端末の中で描くだけ。願いの言葉はサーバーへ送らない。
// ここには描く内容を決める純粋な関数だけを置き、node --test で確かめる（描くのは mission.js）。
// 紙と商品には「25143」・星・MORUNE だけを入れる（docs/権利の確認.md）。

// 80mm ロールの印字幅 72mm、203dpi で 576 ドット
export const RECEIPT_WIDTH = 576;

// 絵は星のドット絵のガチャで決まる。ふつう3種類＋レア1種類（およそ10回に1回）
export const RECEIPT_VARIANTS = Object.freeze([
  {id: 'dusk', name: '夕方の一番星', rare: false},
  {id: 'night', name: '満天の星', rare: false},
  {id: 'dawn', name: '夜明け', rare: false},
  // 流れ星は「だれかの願いが叶った知らせ」に使うので、帰還票のレアは別の絵（二重星）にする（2026-10-12、本人と決定）
  {id: 'double', name: '二重星', rare: true},
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

// 観測の記録（QR の下の1行）。どの空・いつ・どの絵から帰ってきたかを、標本のラベルのように残す（2026-10-11、本人が①緯度経度に決定）。
// 同じ場所・時刻・絵柄・番号があれば、同じ星空と絵を描き直せる（再現性）。位置は小数1桁（約10km）
function coordinate(value, positive, negative) {
  return `${Math.abs(value).toFixed(1)}°${value >= 0 ? positive : negative}`;
}
export function observationLine({observer, time, variant, serial}) {
  const date = new Date(time);
  const clock = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const place = observer && Number.isFinite(observer.lat) && Number.isFinite(observer.lon)
    ? `${coordinate(observer.lat, 'N', 'S')} ${coordinate(observer.lon, 'E', 'W')} `
    : '';
  return `観測 ${place}${formatDate(time)} ${clock} ／ ${variant.name} No.${String(serial).padStart(4, '0')}`;
}

function formatDate(time) {
  const date = new Date(time);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

// 願いの言葉を入れるかは本人が選ぶ（「願いの言葉も入れる」。紙の主役なので初期値は入れる。2026-10-07 変更）
export function returnReceiptContent({wish, now, distanceText = '', number = null, includeText = false, qrUrl = '', observer = null}) {
  const firstStep = typeof wish.firstStep === 'string' ? wish.firstStep.trim() : '';
  const variant = receiptVariant(wish.id);
  // 預けた日 → 帰ってきた日。同じ日なら1つだけ（旅の長さが、紙を見ただけで分かるように）
  const deposited = Number.isFinite(wish.createdAt) && wish.createdAt > 0 ? formatDate(wish.createdAt) : '';
  // 印刷し直した日ではなく帰還した日を使う。時刻のない古い願いは、最後に判断した日で代用する。
  const returnedAt = Number.isFinite(wish.returnedAt) ? wish.returnedAt : Number.isFinite(wish.updatedAt) ? wish.updatedAt : now;
  const returned = formatDate(returnedAt);
  const meta = [deposited && deposited !== returned ? `${deposited} → ${returned}` : returned];
  if (distanceText) meta.push(`25143まで ${distanceText}`);
  // ハートの数は紙に載せない。紙はシェアや展示の印刷で人に見えるため（数は回収記録で本人だけが見る。2026-10-12）
  // 紙の文字は最小限にする（2026-10-07、本人の判断：文字が多くてごちゃごちゃする）。
  // 載せるのは、番号・絵・（選んだときだけ）願いの言葉・日付と距離・QR・最初の一歩だけ
  return {
    variant,
    wishText: includeText ? wish.text : '',
    meta,
    number,
    // 読み取ると、自分の星（このアプリ）へ。紙を財布に入れておけば、また開くきっかけになる
    qrUrl,
    // 帰ってきたときの場所を使う（古い願いで記録がなければ、今の場所）
    observation: observationLine({observer: wish.observedAt ?? observer, time: returnedAt, variant, serial: hash(wish.id) % 10000}),
    stub: '最初の小さな一歩',
    // アプリで書いた一歩があれば印刷する。なければペンで書く線を残す（記録はアプリ、紙は目に入る場所に置くメモ）
    firstStep,
    // 画像だけが SNS で回っても誤解されないよう、番号が本物の天体名ではないことは必ず書く（IAU は星の名前の販売と無関係と明言している）
    source: distanceText ? '距離：NASA/JPL Horizons ／ 番号は作品の中だけのもので、本物の星の名前ではありません' : '番号は作品の中だけのもので、本物の星の名前ではありません',
    fileName: `morune-25143-receipt-${new Date(now).toLocaleDateString('sv-SE')}.png`,
  };
}
