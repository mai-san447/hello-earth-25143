// 同じ言葉で案内と保留を判断し、片方だけから漏れないようにする。
export const CARE_WORDS = Object.freeze(['死にたい', '消えたい', '自殺', 'しにたい', '生きるのがつらい', '生きるのが辛い']);
export const CARE_URL = 'https://www.mhlw.go.jp/mamorouyokokoro/';
export const CARE_TEXT = 'つらい気持ちのときは、話せる場所があります。';
export const CARE_LINK_TEXT = 'まもろうよ こころ（厚生労働省）';
export function careNotice(text) {
  const plain = String(text ?? '').normalize('NFKC').replace(/\s+/g, '');
  return CARE_WORDS.some(word => plain.includes(word))
    ? `${CARE_TEXT}${CARE_LINK_TEXT} ${CARE_URL}`
    : '';
}
