// 外部例外の名前にも入力が混ざりうるため、ログには決めた種類だけを残す。
export function errorKind(error) {
  const name = error?.name;
  return ['Error', 'TypeError', 'RangeError', 'SyntaxError', 'AbortError', 'TimeoutError', 'DrizzleQueryError'].includes(name) ? name : 'UnknownError';
}
