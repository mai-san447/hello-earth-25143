import { MissionRuntime } from "./mission-runtime";

export function MissionExperience({
  syncMode,
  accountLabel,
}: {
  syncMode: "cloud" | "local";
  accountLabel: React.ReactNode;
}) {
  return (
    <>
      <div id="sync-mode" data-sync={syncMode} hidden />
      <main className="mission-app" id="mission-app">
        <MissionRuntime />
        <canvas id="orbit-canvas" aria-label="数を数えずに眺める、願いの星がイトカワを周回する宇宙" />
        <header className="mission-header">
          <span className="mission-brand">MORUNE <b>25143</b></span>
          <span className="mission-phase">HAYABUSA SAMPLE RETURN</span>
        </header>
        <section className="mission-title" aria-labelledby="mission-title">
          <p className="mission-kicker">HAYABUSA / ITOKAWA</p>
          <h1 id="mission-title">願いを、<br /><span>星に預ける。</span></h1>
        </section>
        <div className="telemetry" aria-live="polite">
          <span className="telemetry-dot" />
          <span id="mission-status">イトカワの軌道を観測中</span>
        </div>
        <div className="mission-controls">
          <button className="primary-control" id="deposit-open" type="button"><span className="control-icon" aria-hidden="true">＋</span>願いを星に預ける</button>
          <button className="shake-control" id="shake" type="button">スマホを振ってサンプル回収</button>
          <button className="fallback-control" id="fallback" type="button">タップで帰還</button>
        </div>
        <button className="sample-trigger" id="sample-trigger" type="button" hidden>カプセルを開く <span aria-hidden="true">↗</span></button>
        <button className="archive-trigger" id="archive-open" type="button">地球の回収記録 <span id="archive-count">0</span></button>
        <section className="sheet deposit-sheet" id="deposit-sheet" aria-label="願いを星に預ける" hidden>
          <div className="sheet-grip" aria-hidden="true" />
          <button className="sheet-close" id="deposit-close" type="button" aria-label="閉じる">×</button>
          <p className="sheet-kicker">01 / SAMPLE TO ORBIT</p>
          <textarea id="wish" aria-label="願い" maxLength={60} />
          <div className="input-meta"><span>MESSAGE TO ITOKAWA</span><span><b id="wish-length">0</b> / 60</span></div>
          <button className="launch-button" id="deposit" type="button">星を軌道へ送る <span aria-hidden="true">↗</span></button>
          <p className="sheet-status" id="deposit-status" role="status" />
        </section>
        <section className="return-card" id="return-card" role="dialog" aria-modal="true" aria-labelledby="returned-text" hidden>
          <div className="card-light" aria-hidden="true" />
          <button className="sheet-close" id="card-close" type="button" aria-label="閉じる">×</button>
          <p className="card-kicker">SAMPLE CAPSULE / 25143</p>
          <p className="returned-stamp">HAYABUSA SAMPLE RETURNED</p>
          <div className="capsule-display" aria-label="カプセルの中にイトカワの試料粒子がある">
            <div className="capsule-lid" aria-hidden="true"><span /></div>
            <div className="capsule-well" aria-hidden="true" />
            <div className="sample-grain" aria-hidden="true"><i /><i /><i /><i /></div>
            <span className="sample-name">ITOKAWA / GRAIN 01</span>
          </div>
          <p className="sample-caption">イトカワから届いた、小さな粒子。</p>
          <h2 id="returned-text" />
          <time id="returned-date" />
          <p className="card-footnote">あの日のあなたから、今日のあなたへ。</p>
          <div className="return-actions" aria-label="帰還した願いの扱い">
            <button className="return-action-primary" id="try-wish" type="button">やってみる</button>
            <button id="return-to-orbit" type="button">戻す</button>
            <button className="return-action-later" id="finish-wish" type="button">終える</button>
          </div>
        </section>
        <section className="archive-sheet" id="archive-sheet" aria-labelledby="archive-title" hidden>
          <button className="sheet-close" id="archive-close" type="button" aria-label="閉じる">×</button>
          <p className="sheet-kicker">EARTH RECOVERY LOG</p>
          <h2 id="archive-title">地球へ帰還した願い</h2>
          <p className="archive-empty" id="archive-empty">まだ帰還した願いはありません。</p>
          <ul id="archive-list" />
        </section>
        <p className="gesture-hint" id="gesture-hint">願いを預けると、星がイトカワの軌道に浮かびます</p>
      </main>
      <div className="account-bar">{accountLabel}</div>
    </>
  );
}
