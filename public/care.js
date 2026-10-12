// 同じ言葉で案内と保留を判断し、片方だけから漏れないようにする。
// 言い方が少し違っても案内が出るように、言いかけの形（死にたく・消えてしまいたい など）も入れる（2026-10-12 レビュー）。
// 案内は端末の中だけで出し、言葉はみんなの星空には出さない（保留にして人が確かめる）
export const CARE_WORDS = Object.freeze([
  '死にたい', '死にたく', 'しにたい', 'しにたく', '自殺',
  '消えたい', '消えたく', '消えてしまいたい', 'いなくなりたい', 'いなくなってしまいたい',
  '生きていたくない', '生きたくない', '生きるのがつらい', '生きるのが辛い',
]);
export const CARE_URL = 'https://www.mhlw.go.jp/mamorouyokokoro/';
export const CARE_TEXT = 'つらい気持ちのときは、話せる場所があります。';
export const CARE_LINK_TEXT = 'まもろうよ こころ（厚生労働省）';
export function careNotice(text) {
  const plain = String(text ?? '').normalize('NFKC').replace(/\s+/g, '');
  return CARE_WORDS.some(word => plain.includes(word))
    ? `${CARE_TEXT}${CARE_LINK_TEXT} ${CARE_URL}`
    : '';
}
