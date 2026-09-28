// Service Worker がリクエストをどう扱うかを決める（#5 病室で使えるようにする）。
// Service Worker からは importScripts で、テストからは node:vm で読み込むため、
// モジュール構文を使わず self.offlineRoute に置く。
(function (root) {
  // 画面を開くのに要る外部ファイル（3D星空の Three.js と Google Fonts）
  const CACHEABLE_HOSTS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];
  // 保存すると困るもの：願いの保存API、ログイン、Service Worker 自身（更新を妨げる）
  const BYPASS_PATHS = ['/api/', '/signin-with-chatgpt', '/signout-with-chatgpt', '/callback', '/sw.js'];

  // 'page'   … ページ本体。ネットを優先し、つながらなければ保存した版を出す
  // 'asset'  … JS・CSS・フォント・データ。保存した版を先に出し、裏で更新する
  // 'bypass' … Service Worker は何もしない
  function offlineRoute({url, method, mode, origin}) {
    if (method !== 'GET') return 'bypass';
    const target = new URL(url);
    if (target.origin === origin) {
      if (BYPASS_PATHS.some(path => target.pathname === path || target.pathname.startsWith(path))) return 'bypass';
      return mode === 'navigate' ? 'page' : 'asset';
    }
    return CACHEABLE_HOSTS.includes(target.hostname) ? 'asset' : 'bypass';
  }

  root.offlineRoute = offlineRoute;
})(typeof self !== 'undefined' ? self : globalThis);
