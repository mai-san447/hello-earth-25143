import { MissionRuntime } from "./mission-runtime";
import { CircleUserRound, X } from "lucide-react";

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
      <div className="splash-screen" id="splash-screen" role="status" aria-live="polite">
        <span>SIGNAL SEARCHING...</span>
      </div>
      <canvas id="starfield-canvas" aria-hidden="true" />
      <main className="mission-app" id="mission-app">
        <MissionRuntime />
        <canvas id="orbit-canvas" aria-label="数を数えずに眺める、願いの星がイトカワを周回する宇宙" />
        <header className="mission-header">
          <span className="mission-brand">MORUNE <b>25143</b></span>
          <span className="mission-phase">HAYABUSA SAMPLE RETURN</span>
        </header>
        <div className="observer-pill" aria-label="観測位置">
          <span className="observer-dot" aria-hidden="true" />
          <span id="observer-reading">OBSERVER: TOKYO, EARTH [ 35.68°N, 139.76°E ]</span>
        </div>
        <button className="account-trigger" id="account-open" type="button" aria-label="アカウントと同期設定" aria-expanded="false" aria-controls="account-sheet">
          <CircleUserRound size={19} strokeWidth={1.65} aria-hidden="true" />
        </button>
        <section className="account-sheet" id="account-sheet" aria-label="アカウントと同期設定" hidden>
          <button className="account-close" id="account-close" type="button" aria-label="閉じる"><X size={16} aria-hidden="true" /></button>
          <p className="account-sheet-kicker">ACCOUNT / SYNC</p>
          <div className="account-identity">{accountLabel}</div>
        </section>
        <section className="mission-title" aria-labelledby="mission-title">
          <p className="mission-kicker">HAYABUSA / ITOKAWA</p>
          <h1 id="mission-title">願いを、<br /><span>星に預ける。</span></h1>
        </section>
        <div className="telemetry" aria-live="polite">
          <span className="telemetry-dot" />
          <span id="mission-status">イトカワの軌道を観測中</span>
        </div>
        <section className="mission-dock" id="mission-dock" data-step="deposit" aria-label="ミッション操作">
          <nav className="mission-segmented" role="tablist" aria-label="ミッションの段階">
            <button id="step-deposit" type="button" role="tab" aria-selected="true" aria-controls="step-panel-deposit" data-mission-step="deposit"><span>01</span>送信 (SEND)</button>
            <button id="step-receive" type="button" role="tab" aria-selected="false" aria-controls="step-panel-receive" data-mission-step="receive"><span>02</span>帰還 (RETURN)</button>
            <button id="step-choose" type="button" role="tab" aria-selected="false" aria-controls="step-panel-choose" data-mission-step="choose"><span>03</span>記録 (ARCHIVE)</button>
          </nav>
          <div className="mission-step-panel" id="step-panel-deposit" role="tabpanel" aria-labelledby="step-deposit" data-step-panel="deposit">
            <div className="mission-controls">
              <button className="primary-control" id="deposit-open" type="button"><span className="control-icon" aria-hidden="true">＋</span>願いを星に預ける</button>
            </div>
          </div>
          <div className="mission-step-panel" id="step-panel-receive" role="tabpanel" aria-labelledby="step-receive" data-step-panel="receive" hidden>
            <div className="mission-controls">
              <div className="mission-secondary-actions">
                <button className="shake-control" id="shake" type="button">シグナルを探す</button>
                <button className="fallback-control" id="fallback" type="button">カプセルを開く</button>
              </div>
            </div>
          </div>
          <div className="mission-step-panel mission-choose-panel" id="step-panel-choose" role="tabpanel" aria-labelledby="step-choose" data-step-panel="choose" hidden>
            <p className="choose-status" id="choose-status" role="status">カプセルの帰還を待っています</p>
            <button className="sample-trigger" id="sample-trigger" type="button" hidden>カプセルを開く <span aria-hidden="true">↗</span></button>
          </div>
          <div className="mission-dock-meta">
            <p className="gesture-hint" id="gesture-hint">願いを預けると、星がイトカワの軌道に浮かびます</p>
            <button className="archive-trigger" id="archive-open" type="button">地球の回収記録 <span id="archive-count">0</span></button>
          </div>
        </section>
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
        <div className="itokawa-label" id="itokawa-label" aria-hidden="true" hidden>25143 ITOKAWA</div>
        <section className="location-backdrop" id="location-modal" role="dialog" aria-modal="true" aria-labelledby="location-title" aria-describedby="location-description">
          <div className="location-panel">
            <p className="sheet-kicker">HAYABUSA / ITOKAWA</p>
            <h2 id="location-title">現在の星空と同期するために位置情報を利用します</h2>
            <p id="location-description">場所に合わせて、星空の向きを調整します。</p>
            <button className="location-allow" id="location-allow" type="button">現在地で星空を同期</button>
            <button className="location-skip" id="location-skip" type="button">位置情報なしで見る</button>
            <p className="location-status" id="location-status" role="status" aria-live="polite" />
          </div>
        </section>
      </main>
    </>
  );
}
