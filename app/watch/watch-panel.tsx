'use client';

import {useEffect, useState} from "react";

type Star = {id: string; kind: string; text: string; status: string; reports: number; createdAt: number; expiresAt: number};
const TOKEN_KEY = "morune-watch-token";

export function WatchPanel() {
  const [token, setToken] = useState("");
  const [stars, setStars] = useState<Star[]>([]);
  const [paused, setPaused] = useState(true);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  useEffect(() => {
    // サーバーの描画と揃えたあと、このタブの保存を読み戻す。
    const frame = requestAnimationFrame(() => {
      try { setToken(sessionStorage.getItem(TOKEN_KEY) ?? ""); }
      catch { setMessage("このタブではトークンを保存できません。"); }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  async function request(action?: string, id?: string) {
    setBusy(true);
    setMessage("");
    try {
      const options = {headers: {Authorization: `Bearer ${token}`, "Content-Type": "application/json"}, cache: "no-store" as const, signal: AbortSignal.timeout(15_000)};
      if (action) {
        const response = await fetch("/api/watch", {...options, method: "POST", body: JSON.stringify({action, ...(id ? {id} : {})})});
        if (!response.ok) {
          const data = await response.json().catch(() => ({})) as {error?: string};
          throw new Error(data.error ?? "変更できませんでした。");
        }
        setDeleting(null);
      }
      const response = await fetch("/api/watch", options);
      const data = await response.json().catch(() => ({})) as {error?: string; stars: Star[]; paused: boolean};
      if (!response.ok) {
        setConnected(false);
        setStars([]);
        throw new Error(data.error ?? "読み込めませんでした。");
      }
      if (!Array.isArray(data.stars) || typeof data.paused !== 'boolean') {
        setConnected(false);
        setStars([]);
        throw new Error('見守りの記録を読み込めませんでした。');
      }
      setStars(data.stars);
      setPaused(data.paused);
      setConnected(true);
      try { sessionStorage.setItem(TOKEN_KEY, token); }
      catch { setMessage("トークンは保存できません。この画面では使えます。"); }
    } catch (error) {
      console.error('watch request', error);
      setMessage('操作できませんでした。トークンと通信を確かめて、もう一度押してください。');
    } finally { setBusy(false); }
  }
  return <main style={{maxWidth: 760, margin: "40px auto", padding: 24, color: "#eee", background: "#121c2b"}}>
    <h1>見守り</h1>
    <form onSubmit={event => {event.preventDefault(); void request();}}>
      <label>トークン <input type="password" autoComplete="off" value={token} onChange={event => {setToken(event.target.value); setConnected(false); setStars([]);}} disabled={busy} /></label>
      <button disabled={busy || !token}>開く・更新</button>
      <button type="button" disabled={busy} onClick={() => {try {sessionStorage.removeItem(TOKEN_KEY);} catch {setMessage("トークンを保存できないタブです。");} setToken(""); setStars([]); setConnected(false);}}>トークンを消す</button>
    </form>
    <p role="status">{message}</p>
    {connected && <>
      <label><input type="checkbox" role="switch" checked={paused} disabled={busy} onChange={event => void request(event.target.checked ? "pause" : "resume")} />新しい言葉をすべて保留にする（一時停止）</label>
      <p>保留・非表示の言葉（新しい順に100件まで）</p>
      {!stars.length && <p>確認待ちの言葉はありません。</p>}
      {stars.map(star => <article key={star.id} style={{borderTop: "1px solid #657080", padding: "16px 0", overflowWrap: "anywhere"}}>
        <p>{star.text}</p>
        <p>{star.status === "held" ? "保留" : "非表示"} · {star.kind === "wish" ? "願い" : "叶ったよ"} · 通報 {star.reports}件</p>
        <p>投稿 {new Date(star.createdAt).toLocaleString("ja-JP")} ／ 期限 {new Date(star.expiresAt).toLocaleString("ja-JP")}</p>
        <button disabled={busy} onClick={() => void request("show", star.id)}>出す</button>{" "}
        <button disabled={busy} onClick={() => void request("hide", star.id)}>隠す</button>{" "}
        <button disabled={busy} onClick={() => setDeleting(star.id)}>消す</button>
        {deleting === star.id && <div><p>この言葉を消しますか。元には戻せません。</p><button disabled={busy} onClick={() => void request("delete", star.id)}>消す</button>{" "}<button disabled={busy} onClick={() => setDeleting(null)}>戻る</button></div>}
      </article>)}
    </>}
  </main>;
}
