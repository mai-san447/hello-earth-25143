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
          <h1 id="mission-title">願いを星に、<br /><span>想いを地球へ。</span></h1>
        </section>
        <div className="telemetry" aria-live="polite">
          <span className="telemetry-dot" />
          <span id="mission-status">イトカワの軌道を観測中</span>
        </div>
        <section className="mission-dock" id="mission-dock" data-step="deposit" aria-label="ミッション操作">
          <nav className="mission-segmented" role="tablist" aria-label="ミッションの段階">
            <button id="step-deposit" type="button" role="tab" aria-selected="true" aria-controls="step-panel-deposit" data-mission-step="deposit"><span>01</span>送信 (SEND)</button>
            <button id="step-receive" type="button" role="tab" aria-selected="false" aria-controls="step-panel-receive" data-mission-step="receive"><span>02</span>帰還 (RETURN)</button>
            <button id="step-choose" type="button" role="tab" aria-selected="false" aria-controls="step-panel-choose" data-mission-step="choose"><span>03</span>受け取り (RECEIVE)</button>
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
                <button className="fallback-control" id="fallback" type="button">タップで帰還</button>
              </div>
            </div>
          </div>
          <div className="mission-step-panel mission-choose-panel" id="step-panel-choose" role="tabpanel" aria-labelledby="step-choose" data-step-panel="choose" hidden>
            <p className="choose-status" id="choose-status" role="status">カプセルの帰還を待っています</p>
            <button className="sample-trigger" id="sample-trigger" type="button" hidden>カプセルを開く <span aria-hidden="true">↗</span></button>
          </div>
          <div className="mission-dock-meta">
            <p className="gesture-hint" id="gesture-hint">願いを預けると、星がイトカワの軌道に浮かびます</p>
            <button className="others-trigger" id="others-open" type="button" hidden>みんなの星 <span id="others-count">0</span></button>
            <button className="archive-trigger" id="archive-open" type="button">地球の回収記録 <span id="archive-count">0</span></button>
          </div>
        </section>
        <section className="sheet deposit-sheet" id="deposit-sheet" aria-label="願いを星に預ける" hidden>
          <div className="sheet-grip" aria-hidden="true" />
          <button className="sheet-close" id="deposit-close" type="button" aria-label="閉じる">×</button>
          <p className="sheet-kicker">01 / SAMPLE TO ORBIT</p>
          <textarea id="wish" aria-label="願い" maxLength={60} />
          <div className="input-meta"><span>MESSAGE TO ITOKAWA</span><span><b id="wish-length">0</b> / 60</span></div>
          <div className="return-from-field">
            <label htmlFor="return-from">帰還が始まる日（任意）</label>
            <input id="return-from" type="date" aria-describedby="return-from-hint" />
            <p id="return-from-hint">入院中など、しばらく手放しておきたいときに。この日までは振っても帰ってきません。空欄なら、すぐ帰還の候補になります。長く預けるときは、ホーム画面に追加してください（iPhone では、しばらく開かないと保存が消えることがあります）。</p>
          </div>
          {/* #22 みんなの星。サーバーの準備ができた環境でだけ出す（初期値は「流さない」） */}
          <div className="publish-field" id="publish-field" hidden>
            <label className="publish-option">
              <input id="publish-wish" type="checkbox" aria-describedby="publish-hint" />
              この願いを、名前を出さずに星空に流す
            </label>
            <p id="publish-hint">言葉だけが30日間、ほかの人の星空に小さく出ます。預けた願いは、これまでどおりこの端末の中にあります。</p>
          </div>
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
          <p className="returned-wait" id="returned-wait" />
          <p className="returned-distance" id="returned-distance" />
          <p className="returned-signals" id="returned-signals" />
          <p className="card-footnote">あの日のあなたから、今日のあなたへ。</p>
          <div className="certificate">
            <label className="certificate-option">
              <input id="certificate-include-text" type="checkbox" />
              願いの言葉も入れる
            </label>
            <button className="return-action-share" id="certificate-save" type="button">帰還証明書を保存</button>
            <p className="share-status" id="certificate-status" role="status" aria-live="polite" />
          </div>
          <label className="share-comment-label" htmlFor="share-comment">コメントを添えてシェア</label>
          <textarea id="share-comment" maxLength={120} placeholder="いまの気持ちを書く（任意）" />
          <p className="share-status" id="share-status" role="status" aria-live="polite" />
          <button className="return-action-share" id="share-wish" type="button">Xで願い星をシェア</button>
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
          <figure className="constellation" aria-labelledby="constellation-caption">
            <canvas id="constellation-canvas" width="560" height="240" role="img" aria-label="受け取った願いを、言葉の近さでつないだ星座" />
            <figcaption id="constellation-caption">願いを受け取るたびに、ここに星座が育っていきます。</figcaption>
          </figure>
          <div className="signal-share" id="signal-share" hidden>
            <p>応援リンクを送ると、受け取った人がスマホを振るだけで、軌道で待つあなたの星に信号が届き、少し明るくなります。名前も言葉も、願いの中身も届きません。</p>
            <button id="signal-share-button" type="button">応援リンクを送る</button>
            <p className="signal-share-status" id="signal-share-status" role="status" aria-live="polite" />
          </div>
          <div className="orbit-number" id="orbit-number" hidden>
            <p>あなたの番号 <b id="orbit-number-value" /></p>
            <p className="orbit-number-note">この作品の中だけの番号です。本物の星や小惑星に名前が付くわけではありません（国際天文学連合・JAXA とは関係ありません）。</p>
          </div>
          <section className="my-record" aria-labelledby="my-record-title">
            <h3 id="my-record-title">あなたの記録</h3>
            <dl id="my-record" />
            <p className="my-record-note">数だけを、この端末の中で数えています。願いの中身は含みません。検証に協力するときは、下のボタンで数をコピーして渡してください。</p>
            <button id="my-record-copy" type="button">記録の数をコピー</button>
            <p className="my-record-status" id="my-record-status" role="status" aria-live="polite" />
          </section>
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
            <p className="policy-updated">内容更新日：2026年9月30日</p>
            <div className="policy-content" id="policy-content" tabIndex={0}>
              <section>
                <h3>運営者</h3>
                <p>西川 舞衣子（個人事業主）<br />〒150-0041 東京都渋谷区神南1丁目11-4 FPGリンクス神南 5階</p>
              </section>
              <section>
                <h3>このサービスについて</h3>
                <p>本サービスは、想いを短いテキストとして端末に預け、はやぶさとイトカワをモチーフにした演出で見返す個人制作の試験公開版です。「SIGNAL: はやぶさ、地球を撮って。」は演出上のコピーで、実際の交信記録やJAXAの公式発表からの引用ではありません。JAXAその他の機関が運営・承認するサービスではありません。</p>
              </section>
              <section>
                <h3>入力内容と保存</h3>
                <p>願いは60文字以内で入力できます。イトカワの軌道に置ける願いは30個まで、帰還が始まる日は翌日から1年後までです。応援の信号は、同じ星へは1台の端末から1日1回まで送れます。現在のCloudflare版では、願いと回収記録はこのブラウザーのIndexedDBに保存され、アプリのサーバーやクラウドへ送信されません（「星空に流す」を選んだ言葉だけは例外です。下の「みんなの星」をご覧ください）。別の端末・ブラウザーとは同期されず、端末の故障、ブラウザーのデータ消去、サイトデータの削除などで失われることがあります。個別のバックアップ・復元機能はありません。</p>
                <p>願いはこの端末の中にだけ保存され、「星空に流す」を選ばない限り、運営者やサーバーには送られません。ほかの人に見られたくない内容を書くときは、端末の画面ロックをお使いください。パスワードや、第三者の個人情報・秘密は入力しないでください。入力内容の権利は利用者に留保されます。第三者の権利を侵害する内容、違法な内容、他者への嫌がらせを目的とする内容は入力しないでください。</p>
              </section>
              <section>
                <h3>端末への保存（オフライン）</h3>
                <p>ネットのない場所でも開けるよう、画面と部品（描画ライブラリーやフォントを含む）をこのブラウザーに保存します。願いの内容はこの保存には含まれません。ブラウザーのサイトデータを消すと、保存も消えます。</p>
              </section>
              <section>
                <h3>応援の信号</h3>
                <p>応援リンク（/signal）から信号が送られると、サーバーにはこの端末で作ったランダムな識別子（軌道ID）と、信号が届いた時刻だけを保存します。送った人の名前・言葉、願いの内容は保存しません。応援リンクを知っている人は誰でも信号を送れます。この機能は、サーバー側の準備ができた環境でだけ表示されます。</p>
              </section>
              <section>
                <h3>みんなの星（匿名の公開）</h3>
                <p>願いを預けるときに「星空に流す」を選んだ場合と、「叶ったよ」のひとことを流した場合に限り、その言葉（願いは60文字、叶ったよは40文字まで）と軌道IDをサーバーに保存し、名前を出さずにほかの利用者の星空に表示します。初期値は「流さない」です。名前・メールアドレス・IPアドレスは保存しません。公開した言葉は、願いは30日、「叶ったよ」は24時間で表示されなくなります。</p>
                <p>URL、メールアドレス、電話番号らしい数字、病院名らしい言葉、登録した注意語が入った言葉は、すぐには表示せず、運営者が確認してから表示するか決めます。ほかの利用者から通報が3件あった言葉は非表示になり、運営者が確認します。運営者は、公開された言葉を確認・非表示・削除できます。</p>
                <p>はじめて公開した端末には「25143-0001」のような番号を付けます。これはこの作品の中だけの番号で、本物の星や小惑星の名前ではありません。国際天文学連合（IAU）やJAXAとは関係ありません。この機能は、サーバー側の準備ができた環境でだけ表示されます。</p>
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
                <p>画面内のイトカワ・探査機表現は創作上の演出で、公式の科学資料ではありません。イトカワまでの距離は、NASA/JPL Horizons の暦（小惑星 25143 Itokawa、地球中心から見た距離、1日ごとの値）をもとにした概算で、アプリに同梱した表から表示しています。サービスは試験公開中のため、予告なく変更・停止する場合があります。データの永続性、特定目的への適合性、常時利用可能であることは保証しません。大切な記録の保管には使わないでください。</p>
              </section>
              <p className="policy-contact-note">個人制作の試験公開版です。お問い合わせは、MORUNE のサイトの<a href="https://morune.store/contact" target="_blank" rel="noopener noreferrer">問い合わせフォーム</a>からお願いします。</p>
            </div>
          </div>
        </section>
        {/* #22 みんなの星：はじめて公開する前の約束 */}
        <section className="stars-backdrop" id="promise-sheet" role="dialog" aria-modal="true" aria-labelledby="promise-title" hidden>
          <div className="stars-panel">
            <p className="sheet-kicker">STARS OF EVERYONE</p>
            <h2 id="promise-title">星空に流す前に、3つの約束</h2>
            <ul className="promise-list">
              <li>やさしい言葉だけを流します</li>
              <li>名前・連絡先・病院名は書きません</li>
              <li>他の人の願いを笑いません</li>
            </ul>
            <p className="stars-note">流れるのは言葉だけです。名前や端末の情報は出ません。願いは30日、「叶ったよ」は24時間で空から消えます。</p>
            <button className="stars-primary" id="promise-agree" type="button">約束して流す</button>
            <button className="stars-secondary" id="promise-decline" type="button">今は流さない</button>
          </div>
        </section>
        {/* 他の人の星に触れたときのカード。できるのは信号と通報だけ（返信・いいねの数は作らない） */}
        <section className="stars-backdrop" id="star-card" role="dialog" aria-modal="true" aria-labelledby="star-card-text" hidden>
          <div className="stars-panel star-card">
            <button className="sheet-close" id="star-card-close" type="button" aria-label="閉じる">×</button>
            <p className="sheet-kicker" id="star-card-kicker">SOMEONE&apos;S WISH</p>
            <h2 id="star-card-text" />
            <p className="stars-note">名前を出さずに流された言葉です。</p>
            <div className="star-card-actions" id="star-card-actions">
              <button className="stars-primary" id="star-signal" type="button">応援の信号を送る</button>
              <button className="star-report" id="star-report" type="button">通報</button>
            </div>
            <div className="star-report-confirm" id="star-report-confirm" hidden>
              <p>この言葉を通報しますか。運営者が確かめます。</p>
              <button className="stars-primary" id="star-report-send" type="button">通報する</button>
              <button className="stars-secondary" id="star-report-cancel" type="button">やめる</button>
            </div>
            <p className="stars-status" id="star-card-status" role="status" aria-live="polite" />
          </div>
        </section>
        {/* #22 想いを受け取ったあとの「叶ったよ」（任意・24時間の流れ星） */}
        <section className="stars-backdrop" id="fulfilled-sheet" role="dialog" aria-modal="true" aria-labelledby="fulfilled-title" hidden>
          <div className="stars-panel">
            <p className="sheet-kicker">SHOOTING STAR / 24H</p>
            <h2 id="fulfilled-title">「叶ったよ」のひとこと（任意）</h2>
            <p className="stars-note">書くと、24時間だけ、ほかの人の星空に流れ星として出ます。名前は出ません。</p>
            <textarea id="fulfilled-text" maxLength={40} aria-label="叶ったよ、のひとこと" placeholder="例：海を見に行けた" />
            <div className="input-meta"><span>ONE LINE</span><span><b id="fulfilled-length">0</b> / 40</span></div>
            <button className="stars-primary" id="fulfilled-send" type="button">流れ星にして流す</button>
            <button className="stars-secondary" id="fulfilled-skip" type="button">今は流さない</button>
            <p className="stars-status" id="fulfilled-status" role="status" aria-live="polite" />
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
