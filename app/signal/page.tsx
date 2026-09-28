import type { Metadata } from "next";
import Link from "next/link";
import { SignalRuntime } from "./signal-runtime";

export const metadata: Metadata = {
  title: "星に、信号を送る | 25143",
  description: "イトカワの軌道で待っている願いの星に、名前も言葉もない信号を送る。",
};

// 応援する人が開くページ。願いの持ち主が送った「応援リンク」（/signal?to=軌道ID）から来る。
export default function SignalPage() {
  return (
    <main className="signal-page">
      <SignalRuntime />
      <p className="signal-kicker">SIGNAL TO ITOKAWA / 25143</p>
      <h1>星に、信号を送る。</h1>
      <p className="signal-lead">イトカワの軌道で、誰かの願いの星が待っています。信号を送ると、その星が少し明るくなります。</p>
      <ul className="signal-promises">
        <li>名前も言葉も届きません</li>
        <li>願いの中身は、あなたにも見えません</li>
        <li>持ち主は、願いが帰ってきた日に「届いた信号の数」だけを受け取ります</li>
      </ul>
      <div className="signal-star" id="signal-star" aria-hidden="true"><span /></div>
      <button className="signal-send" id="signal-send" type="button" disabled>信号を送る</button>
      <p className="signal-hint" id="signal-hint">スマホを振っても送れます。</p>
      <p className="signal-status" id="signal-status" role="status" aria-live="polite" />
      <Link className="signal-home" href="/">自分の願いを預ける ↗</Link>
    </main>
  );
}
