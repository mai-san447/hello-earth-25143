import type { Metadata, Viewport } from "next";
export const metadata: Metadata = { title: "25143 | HELLO EARTH", description: "イトカワへ預けた願いを、はやぶさがひとつずつ連れ帰る。" };
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export default function RootLayout({children}: Readonly<{children:React.ReactNode}>) {return <html lang="ja"><head><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /><link rel="stylesheet" href="/style.css" /></head><body>{children}</body></html>}
