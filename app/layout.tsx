import type { Metadata, Viewport } from "next";
// 題名と説明は X などでリンクを共有したときにも出る。商品・外に出るものには「25143」・星・MORUNE だけを使う（docs/権利の確認.md）
export const metadata: Metadata = { title: "MORUNE 25143", description: "やりたいことを星に預けておく　預けた願いは いつか帰ってくる" };
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050812",
};
export default function RootLayout({children}: Readonly<{children:React.ReactNode}>) {return <html lang="ja"><head><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /><link rel="stylesheet" href="/style.css" /><link rel="manifest" href="/manifest.webmanifest" /><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" /><meta name="apple-mobile-web-app-capable" content="yes" /><meta name="apple-mobile-web-app-title" content="25143" />{/* アクセス数を数える Cloudflare Web Analytics（Cookie を使わない）。願いの言葉は送らない。オフラインでは読み込めないだけで画面は動く */}<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "31fd22cc513e4c4f8c890364e2dc6875"}' /></head><body>{children}</body></html>}
