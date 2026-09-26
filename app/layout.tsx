import type { Metadata } from "next";
export const metadata: Metadata = { title: "25143 | HELLO EARTH", description: "イトカワへ預けた願いを、はやぶさがひとつずつ連れ帰る。" };
export default function RootLayout({children}: Readonly<{children:React.ReactNode}>) {return <html lang="ja"><head><link rel="stylesheet" href="/style.css" /></head><body>{children}</body></html>}
