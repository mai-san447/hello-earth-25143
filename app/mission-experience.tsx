import { MissionRuntime } from "./mission-runtime";
import { CircleUserRound, Smartphone, X } from "lucide-react";

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
          <button className="policy-open" id="policy-open" type="button" aria-haspopup="dialog">利用規約・プライバシー <span aria-hidden="true">›</span></button>
        </section>
        <section className="mission-title" aria-labelledby="mission-title">
          <p className="mission-kicker">SIGNAL: はやぶさ、地球を撮って。</p>
          <h1 id="mission-title">3億キロ先へ、<br /><span>想いを飛ばす。</span></h1>
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
                <button className="shake-control" id="shake" type="button"><span className="shake-glyph" aria-hidden="true"><i /><Smartphone size={18} strokeWidth={1.8} /></span><span>シグナルを探す</span></button>
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
          <p className="card-kicker">WISH CAPSULE / 25143</p>
          <p className="returned-stamp">WISH STAR / RETURNED</p>
          <div className="sample-particle-stage" role="img" aria-label="イトカワの軌道から地球へ帰還した願い星">
            <span className="sample-particle-orbit sample-particle-orbit-outer" aria-hidden="true" />
            <span className="sample-particle-orbit sample-particle-orbit-inner" aria-hidden="true" />
            <span className="sample-particle-aura" aria-hidden="true">
              <span className="sample-particle-core" />
            </span>
            <span className="sample-name">WISH STAR / 01</span>
          </div>
          <p className="sample-caption">イトカワの軌道をめぐり、地球へ帰ってきた願い星。</p>
          <h2 id="returned-text" />
          <time id="returned-date" />
          <p className="card-footnote">あの日のあなたから、今日のあなたへ。</p>
          <label className="share-comment-label" htmlFor="share-comment">コメントを添えてシェア</label>
          <textarea id="share-comment" maxLength={120} placeholder="いまの気持ちを書く（任意）" />
          <p className="share-status" id="share-status" role="status" aria-live="polite" />
          <button className="return-action-share" id="share-wish" type="button">願い星をシェア</button>
          <div className="return-actions" aria-label="帰還した願いの扱い">
            <button className="return-action-primary" id="try-wish" type="button">想いを受け取る</button>
            <button id="return-to-orbit" type="button">軌道へ戻す</button>
            <button className="return-action-later" id="finish-wish" type="button">アーカイブに保存</button>
          </div>
        </section>
        <section className="archive-sheet" id="archive-sheet" aria-labelledby="archive-title" hidden>
          <button className="sheet-close" id="archive-close" type="button" aria-label="閉じる">×</button>
          <p className="sheet-kicker">EARTH RECOVERY LOG</p>
          <h2 id="archive-title">地球へ帰還した願い</h2>
          <p className="archive-empty" id="archive-empty">まだ帰還した願いはありません。</p>
          <ul id="archive-list" />
          <div className="archive-management">
            <label className="archive-select-all"><input id="archive-select-all" type="checkbox" disabled />すべて選択</label>
            <div className="archive-management-actions">
              <button id="archive-delete-selected" type="button" disabled>選択した願いを削除 <span id="archive-selection-count">0</span></button>
              <button id="archive-reset" type="button">すべてリセット</button>
            </div>
            <p id="archive-status" role="status" aria-live="polite" />
            <button id="archive-next" className="archive-next" type="button">次の願いを送る <span aria-hidden="true">↗</span></button>
          </div>
        </section>
        <section className="policy-backdrop" id="policy-sheet" role="dialog" aria-modal="true" aria-labelledby="policy-title" hidden>
          <div className="policy-panel">
            <button className="policy-close" id="policy-close" type="button" aria-label="利用規約を閉じる">×</button>
            <p className="sheet-kicker">TERMS / PRIVACY</p>
            <h2 id="policy-title">利用規約・プライバシー</h2>
            <p className="policy-updated">内容更新日：2026年9月27日</p>
            <div className="policy-content" id="policy-content" tabIndex={0}>
              <section>
                <h3>このサービスについて</h3>
                <p>本サービスは、想いを短いテキストとして端末に預け、はやぶさとイトカワをモチーフにした演出で見返す個人制作の試験公開版です。「SIGNAL: はやぶさ、地球を撮って。」は演出上のコピーで、実際の交信記録やJAXAの公式発表からの引用ではありません。JAXAその他の機関が運営・承認するサービスではありません。</p>
              </section>
              <section>
                <h3>入力内容と保存</h3>
                <p>願いは60文字以内で入力できます。現在のCloudflare版では、願いと回収記録はこのブラウザーのIndexedDBに保存され、アプリのサーバーやクラウドへ送信されません。別の端末・ブラウザーとは同期されず、端末の故障、ブラウザーのデータ消去、サイトデータの削除などで失われることがあります。個別のバックアップ・復元機能はありません。</p>
                <p>氏名、住所、連絡先、健康情報、パスワード、秘密情報や、第三者の個人情報・秘密は入力しないでください。入力内容の権利は利用者に留保されます。第三者の権利を侵害する内容、違法な内容、他者への嫌がらせを目的とする内容は入力しないでください。</p>
              </section>
              <section>
                <h3>位置情報</h3>
                <p>位置情報の利用は任意です。許可した場合、座標はこのブラウザー内で星空の向きとObserver表示を調整するために使い、アプリの願い保存APIへ送信しません。「位置情報なしで見る」を選んでも利用できます。許可の扱いはブラウザーや端末の設定にも従います。</p>
              </section>
              <section>
                <h3>通信と外部サービス</h3>
                <p>ページ配信にはCloudflareを利用し、フォントや描画ライブラリーの読み込みにGoogle Fonts、jsDelivrなど外部配信元を利用します。ページ表示時には、各サービスへIPアドレスやブラウザー情報など通信に通常必要な情報が送られる場合があります。これらの情報の取り扱いは各提供者のポリシーにも従います。</p>
              </section>
              <section>
                <h3>利用上の注意</h3>
                <p>画面内のイトカワ・探査機表現は創作上の演出で、公式の科学資料ではありません。サービスは試験公開中のため、予告なく変更・停止する場合があります。データの永続性、特定目的への適合性、常時利用可能であることは保証しません。大切な記録の保管には使わないでください。</p>
              </section>
              <p className="policy-contact-note">個人制作の試験公開版です。運営者情報と問い合わせ窓口は未掲載のため、正式提供・商用提供の前に整備が必要です。</p>
            </div>
          </div>
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
