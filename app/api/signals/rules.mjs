// 番号と公開星が共通で使うため、軌道IDの検証だけを残す。

const ORBIT_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export function isOrbitId(value) {
  return typeof value === 'string' && ORBIT_ID.test(value);
}
