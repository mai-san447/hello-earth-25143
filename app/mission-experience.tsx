import { MissionRuntime } from "./mission-runtime";
import { Smartphone } from "lucide-react";

export function MissionExperience({
  syncMode,
}: {
  syncMode: "cloud" | "local";
}) {
  return (
    <>
      <div id="sync-mode" data-sync={syncMode} hidden />
      <div className="splash-screen" id="splash-screen" role="status" aria-live="polite">
        <span>MORUNE 25143</span>
      </div>
      <canvas id="starfield-canvas" aria-hidden="true" />
      <main className="mission-app" id="mission-app">
        <MissionRuntime />
        <canvas id="orbit-canvas" aria-label="願いの星が灯る、今いる場所の本物の星空" />
        <header className="mission-header">
          <span className="mission-brand">MORUNE <b>25143</b></span>
        </header>
        <div className="observer-pill" aria-label="観測位置">
          <span className="observer-dot" aria-hidden="true" />
          <span id="observer-reading">35.7°N 139.8°E</span>
        </div>
        <section className="mission-title" aria-labelledby="mission-title">
          {/* 見出しは句読点を置かず、改行で区切る（大きな明朝の「。」は行末に穴があいて見えるため）。書体はしっぽり明朝 B1 と Cormorant Garamond（2026-10-12 本人と決定） */}
          <p className="title-kicker" lang="en">Leave your wish with the stars</p>
          <h1 id="mission-title">やりたいことを<br />星に預けておく</h1>
          <p className="title-sub">預けた願いは　いつか帰ってくる</p>
        </section>
        <div className="telemetry" aria-live="polite">
          <span className="telemetry-dot" />
          <span id="mission-status" />
        </div>
        <section className="mission-dock" id="mission-dock" data-step="deposit" aria-label="ミッション操作">
          <div className="mission-step-panel" id="step-panel-deposit" data-step-panel="deposit">
            <div className="mission-controls">
              <button className="primary-control" id="deposit-open" type="button"><span className="control-icon" aria-hidden="true">＋</span>願いを星に預ける</button>
            </div>
          </div>
          <div className="mission-step-panel" id="step-panel-receive" data-step-panel="receive" hidden>
            <div className="mission-controls">
              <div className="mission-secondary-actions">
                <button className="shake-control" id="shake" type="button"><span className="shake-glyph" aria-hidden="true"><i /><Smartphone size={18} strokeWidth={1.8} /></span><span>振って帰す</span></button>
                <button className="fallback-control" id="fallback" type="button">ひとつ帰す</button>
              </div>
            </div>
          </div>
          <div className="mission-dock-meta">
            <p className="gesture-hint" id="gesture-hint">願いを預けると、星がひとつ灯ります</p>
            {/* 行き先の入口は下の段にまとめる（親指が届く。上は見出しと星空だけにする。2026-10-12） */}
            <div className="dock-places">
              <button className="everyone-open" id="everyone-open" type="button" hidden>みんなの空</button>
              <button className="archive-trigger" id="archive-open" type="button">回収記録 <span id="archive-count">0</span></button>
            </div>
          </div>
        </section>
        <section className="sheet deposit-sheet" id="deposit-sheet" aria-label="願いを星に預ける" hidden>
          <div className="sheet-grip" aria-hidden="true" />
          <button className="sheet-close" id="deposit-close" type="button" aria-label="閉じる">×</button>
          <h2 className="deposit-question">いつか、何をしたい？</h2>
          <label className="wish-label" htmlFor="wish">願い（12字まで）</label>
          <textarea id="wish" maxLength={24} placeholder="例：天文台に行く" />
          <div className="input-meta"><span /><span><b id="wish-length">0</b> / 12</span></div>
          {/* みんなの空に出すかを選ぶ。初期値は出さない（2026-10-12）。サーバーの準備ができた環境でだけ出す */}
          <div className="publish-field" id="publish-field" hidden>
            <label className="publish-option">
              <input id="publish-wish" type="checkbox" aria-describedby="publish-hint" />
              みんなの空にも出す
            </label>
            <p id="publish-hint">出さなければ、わたしの空にだけ灯ります。名前は出ません</p>
          </div>
          <button className="launch-button" id="deposit" type="button">預ける</button>
          <p className="sheet-status" id="deposit-status" role="status" />
        </section>
        <section className="return-card" id="return-card" role="dialog" aria-modal="true" aria-labelledby="returned-text" hidden>
          <div className="card-light" aria-hidden="true" />
          <button className="sheet-close" id="card-close" type="button" aria-label="閉じる">×</button>
          <div className="sample-particle-stage" role="img" aria-label="地球へ帰還した願い星">
            <span className="sample-particle-orbit sample-particle-orbit-outer" aria-hidden="true" />
            <span className="sample-particle-orbit sample-particle-orbit-inner" aria-hidden="true" />
            <span className="sample-particle-aura" aria-hidden="true">
              <span className="sample-particle-core" />
            </span>
            <span className="sample-name" id="returned-number" />
          </div>
          <h2 id="returned-text" />
          <time id="returned-date" />
          <p className="returned-wait" id="returned-wait" />
          <p className="return-question">どうする？</p>
          <div className="return-actions" aria-label="選択">
            <button className="return-action-primary" id="try-wish" type="button">受け取る</button>
            <button id="return-to-orbit" type="button">もう少し預ける</button>
          </div>
        </section>
        <section className="archive-sheet" id="archive-sheet" aria-labelledby="archive-title" hidden>
          <button className="sheet-close" id="archive-close" type="button" aria-label="閉じる">×</button>
          <h2 id="archive-title">回収記録</h2>
          <p className="archive-empty" id="archive-empty">まだ帰ってきた願いはありません。</p>
          {/* 回収記録は「帰ってきた願い」が主役。一覧を先に置き、番号・記録の数はその下へ（2026-10-07） */}
          <ul id="archive-list" />
          <div className="archive-management">
            <button id="archive-next" className="archive-next" type="button">次の願いを預ける <span aria-hidden="true">↗</span></button>
            {/* 削除・リセットはめったに使わないので畳んでおく（2026-10-07） */}
            <details className="archive-tidy">
              <summary>整理する</summary>
              <label className="archive-select-all"><input id="archive-select-all" type="checkbox" disabled />すべて選択</label>
              <div className="archive-management-actions">
                <button id="archive-delete-selected" type="button" disabled>選択した願いを削除 <span id="archive-selection-count">0</span></button>
                <button id="archive-reset" type="button">すべて消す</button>
              </div>
            </details>
            <p id="archive-status" role="status" aria-live="polite" />
          </div>
          <div className="orbit-number" id="orbit-number" hidden>
            <p>あなたの番号 <b id="orbit-number-value" /></p>
            <p className="orbit-number-note">作品の中だけの番号です（本物の小惑星の名前ではありません）。</p>
          </div>
          {/* 検証用の数。ふだんは畳んでおく */}
          <details className="my-record">
            <summary id="my-record-title">あなたの記録</summary>
            <dl id="my-record" />
            <p className="my-record-note">数だけを、この端末の中で数えています。願いの中身は含みません。</p>
            <button id="my-record-copy" type="button">記録の数をコピー</button>
            <p className="my-record-status" id="my-record-status" role="status" aria-live="polite" />
          </details>
          <button className="policy-open" id="policy-open" type="button" aria-haspopup="dialog">利用規約・プライバシー <span aria-hidden="true">›</span></button>
        </section>
        <section className="policy-backdrop" id="policy-sheet" role="dialog" aria-modal="true" aria-labelledby="policy-title" hidden>
          <div className="policy-panel">
            <button className="policy-close" id="policy-close" type="button" aria-label="利用規約を閉じる">×</button>
            <h2 id="policy-title">利用規約・プライバシー</h2>
            <p className="policy-updated">内容更新日：2026年10月12日</p>
            <div className="policy-content" id="policy-content" tabIndex={0}>
              <section>
                <h3>運営者</h3>
                <p>西川 舞衣子（個人事業主）<br />〒150-0041 東京都渋谷区神南1丁目11-4 FPGリンクス神南 5階</p>
              </section>
              <section>
                <h3>このサービスについて</h3>
                <p>本サービスは、想いを短いテキストとして端末に預け、はやぶさとイトカワをモチーフにした演出で見返す個人制作の試験公開版です。JAXAその他の機関が運営・承認するサービスではありません。</p>
              </section>
              <section>
                <h3>入力内容と保存</h3>
                <p>願いは12文字以内で入力できます。預けられる願いは19個までです。願いと回収記録はこのブラウザーのIndexedDBに保存されます。「みんなの空に出す」を選んだ願いの言葉だけを、サーバーにも送ります。選ばなければ送りません。別の端末・ブラウザーとは同期されず、端末の故障、ブラウザーのデータ消去、サイトデータの削除などで失われることがあります。個別のバックアップ・復元機能はありません。長く預けるときは、ホーム画面に追加してください（iPhone では、しばらく開かないとサイトの保存が消えることがあります）。</p>
                <p>ほかの人に見られたくない内容を書くときは、端末の画面ロックをお使いください。パスワードや、第三者の個人情報・秘密は入力しないでください。入力内容の権利は利用者に留保されます。第三者の権利を侵害する内容、違法な内容、他者への嫌がらせを目的とする内容は入力しないでください。</p>
              </section>
              <section>
                <h3>端末への保存（オフライン）</h3>
                <p>ネットのない場所でも開けるよう、画面と部品（描画ライブラリーやフォントを含む）をこのブラウザーに保存します。願いの内容はこの保存には含まれません。ブラウザーのサイトデータを消すと、保存も消えます。</p>
              </section>
              <section>
                <h3>番号</h3>
                <p>はじめて願いを預けた端末には「25143-0001」のような番号を付け、願いごとに「25143-0001-03」のような番号を付けます。端末の番号を付けるときだけ、この端末で作ったランダムな識別子（軌道ID）と番号を付けた時刻を運営者のデータベースに保存します（番号の発行では願いの内容・名前・IPアドレスは保存しません）。願いごとの番号は端末の中で数え、送信しません。これはこの作品の中だけの番号で、本物の星や小惑星の名前ではありません。国際天文学連合（IAU）やJAXAとは関係ありません。</p>
              </section>
              <section>
                <h3>みんなの空</h3>
                <p>預けた願いは、初めはわたしの空にだけ灯ります。みんなの空に出すのは、自分で選んだ願いだけです。選べるのは、預けるとき（「みんなの空にも出す」）と、受け取って帰還票ができたとき（「みんなの空に出す」）です。みんなの空が止まっている環境では、端末の中だけに預かります。</p>
                <p>出した言葉・軌道ID（端末で作るランダムな識別子）・時刻・段階（預けた／やってみることにした）を保存します。名前・メールアドレス・IPアドレスは保存しません。預けた願いは最長400日、受け取って出した願いは1年、帰ってきて出さなかった星は帰還から30日残ります。「叶ったよ」は24時間です。気になる言葉は運営が確認してから出し、通報が3件届くと非表示にします。</p>
                <p>みんなの空の星には、ハートを送れます（同じ星へは1台の端末から1日1回）。ハートの数は、その星を出した人にだけ見えます。だれが送ったかは記録しません。ハートを送るとき、端末の軌道IDも届きますが、保存はしません。1日1回を数えるために、日付・軌道ID・星を運営者だけが持つ鍵で混ぜた値を残し、3日を過ぎたものは順に消します。ハートを送れるのは、願いを1つ以上預けたことのある端末です。</p>
                <p>自分の言葉は回収記録からいつでも消せます。ネットがないときの削除は控え、つながったときに送ります。削除の依頼は<a href="https://morune.store/contact" target="_blank" rel="noopener noreferrer">問い合わせフォーム</a>からお願いします。</p>
              </section>
              <section>
                <h3>みんなの空のルール</h3>
                <p>みんなで気持ちよく空を見られるよう、次のルールで運営します。</p>
                <ul>
                  <li>書かないこと：名前・住所・電話番号・メールアドレス・URLなど、だれかが分かること。ほかの人への悪口やいやがらせ。宣伝。法律や他人の権利に反すること。</li>
                  <li>数：預けられる願いは1台の端末で19個まで。みんなの空に出せるのは、1台の端末から1日10件、全員あわせて1日500件までです。短い時間に何度も送ると、少し時間をおくようお願いすることがあります。</li>
                  <li>確認：URLや電話番号らしい数字、気になる言葉を含む願いは、すぐには出さず、運営が確かめてから出します。運営が見守れない期間は、新しい願いをすべて確かめてから出します。</li>
                  <li>つらい気持ちの言葉：みんなの空には出しません。書いた人には、相談できる窓口をこの端末の中だけでお知らせします。</li>
                  <li>通報：気になる言葉は「…」から通報できます（同じ言葉へは1台の端末から1回）。3件の通報で見えなくなり、運営が確かめて戻すか消します。</li>
                  <li>運営は、ルールに合わない言葉を、お知らせなく見えなくしたり消したりできます。</li>
                  <li>淡い星は預けられた願い、明るい星はやってみることにした願い、流れ星はだれかの「叶ったよ」です（24時間）。帰ってきて出さなかった星は、30日のあいだ薄く残ります。</li>
                  <li>ハートは応援だけを届けます。言葉は書けません。数はほかの人には見えません。</li>
                </ul>
              </section>
              <section>
                <h3>X でのシェア</h3>
                <p>「X でシェアする」を押すと、X の投稿画面が開きます。投稿する文（「願いの言葉も入れる」を選んだ場合は願いの言葉を含みます）は、あなたが X に投稿したときだけ X に送られ、X の規約とポリシーに従います。運営者のサーバーには送られません。</p>
              </section>
              <section>
                <h3>位置情報</h3>
                <p>位置情報の利用は任意です。許可した場合、座標はこのブラウザー内で星空を描くために使います。位置は送りません。帰ってきた場所だけを、小数1桁で端末に残し、帰還票に印字します（自分だけの記録）。みんなの空に出す言葉に位置は含めません。「東京の星空で見る」を選んでも利用できます。許可の扱いはブラウザーや端末の設定にも従います。</p>
              </section>
              <section>
                <h3>通信と外部サービス</h3>
                <p>ページ配信にはCloudflareを利用し、フォントや描画ライブラリーの読み込みにGoogle Fonts、jsDelivrなど外部配信元を利用します。ページ表示時には、各サービスへIPアドレスやブラウザー情報など通信に通常必要な情報が送られる場合があります。配信基盤のCloudflareは、障害の調査のため通信の記録（ログ）を一定期間保持する場合があります。これらの情報の取り扱いは各提供者のポリシーにも従います。</p>
              </section>
              <section>
                <h3>星空のデータと出典</h3><p>恒星は Yale Bright Star Catalogue（Hoffleit &amp; Warren 1991）、VizieR V/50 の6等級まで（肉眼で見える星ほぼすべて）を使用しています。VizieR catalogue access tool, CDS, Strasbourg, France（DOI: 10.26093/cds/vizier）に謝意を表します。イトカワの方向は NASA/JPL Horizons の地心赤経・赤緯（2026年10月1日〜2027年12月31日）を日ごとに補間した概算です。位置は端末内だけで計算に使います。大気差・歳差・地形や昼の明るさは再現しません。天の北極を中心にした星図で、端末の向きとは連動しません。大きなイトカワと探査機の表現は演出です。</p></section><section><h3>利用上の注意</h3>
                <p>画面内のイトカワ・探査機表現は創作上の演出で、公式の科学資料ではありません。イトカワまでの距離は、NASA/JPL Horizons の暦（小惑星 25143 Itokawa、地球中心から見た距離、1日ごとの値）をもとにした概算で、アプリに同梱した表から表示しています。サービスは試験公開中のため、予告なく変更・停止する場合があります。データの永続性、特定目的への適合性、常時利用可能であることは保証しません。大切な記録の保管には使わないでください。</p>
              </section>
              <p className="policy-contact-note">個人制作の試験公開版です。お問い合わせは、MORUNE のサイトの<a href="https://morune.store/contact" target="_blank" rel="noopener noreferrer">問い合わせフォーム</a>からお願いします。</p>
            </div>
          </div>
        </section>
        {/* #22 みんなの星：はじめて公開する前の約束 */}
        <section className="stars-backdrop" id="promise-sheet" role="dialog" aria-modal="true" aria-labelledby="promise-title" hidden>
          <div className="stars-panel">
            <p className="sheet-kicker">みんなの空</p>
            <h2 id="promise-title">みんなの空に出す前に</h2>
            <ul className="promise-list">
              <li>誰かを傷つける言葉は書かない</li>
              <li>名前や連絡先は書かない</li>
              <li>ほかの人の願いを笑わない</li>
            </ul>
            <p className="stars-note">名前は出ません。帰ってくるのは、自分の願いだけです。</p>
            <button className="stars-primary" id="promise-agree" type="button">みんなの空に出す</button>
            <button className="stars-secondary" id="promise-decline" type="button">出さない</button>
          </div>
        </section>
        {/* 他の人の星に触れたときのカード。気になる言葉を通報できるようにする（返信・いいねの数は作らない） */}
        <section className="stars-backdrop" id="star-card" role="dialog" aria-modal="true" aria-labelledby="star-card-text" hidden>
          <div className="stars-panel star-card">
            <button className="sheet-close" id="star-card-close" type="button" aria-label="閉じる">×</button>
            <p className="sheet-kicker" id="star-card-kicker">だれかの願い</p>
            <h2 id="star-card-text" />
            <p className="stars-note">名前なしで灯された言葉です。</p>
            <div className="star-card-actions" id="star-card-actions">
              <button className="star-report" id="star-report" type="button">この言葉を通報する</button>
            </div>
            <div className="star-report-confirm" id="star-report-confirm" hidden>
              <p>この言葉を通報しますか。運営者が確かめます。</p>
              <button className="stars-primary" id="star-report-send" type="button">通報する</button>
              <button className="stars-secondary" id="star-report-cancel" type="button">やめる</button>
            </div>
            <p className="stars-status" id="star-card-status" role="status" aria-live="polite" />
          </div>
        </section>
        {/* #22 「叶った」と押したあとの「叶ったよ」（任意・24時間の流れ星）。流れ星は、だれかの願いが叶った知らせ */}
        <section className="stars-backdrop receipt-backdrop" id="receipt-sheet" role="dialog" aria-modal="true" aria-labelledby="receipt-title" hidden>
          <div className="stars-panel receipt-panel">
            <button className="sheet-close" id="receipt-x" type="button" aria-label="閉じる">×</button>
            <h2 id="receipt-title">帰還票が現像されました</h2>
            {/* 完成の画面は帰還票が主役。画面の帰還票と、展示で印刷される紙は同じもの（2026-10-11） */}
            {/* eslint-disable-next-line @next/next/no-img-element -- 端末の中で描いた帰還票（data URL）を出すだけなので、画像の最適化は要らない */}
            <img className="receipt-preview" id="receipt-preview" alt="帰還票" />
            <label className="receipt-label" htmlFor="receipt-first-step">最初の小さな一歩（書くと帰還票に入ります）</label>
            <input id="receipt-first-step" type="text" placeholder="例：天文台の見学に申し込む" />
            <label className="certificate-option" htmlFor="receipt-include-text"><input id="receipt-include-text" type="checkbox" /> 願いの言葉も入れる</label>
            {/* 受け取ったときが、みんなの空に出すかを選ぶ中心の場面（2026-10-12 本人と決定）。押すまで何も送らない */}
            <button className="stars-secondary receipt-publish" id="receipt-publish" type="button" hidden>みんなの空に出す</button>
            <button className="stars-primary receipt-primary" id="receipt-save" type="button">保存する</button>
            <button className="stars-secondary" id="receipt-share" type="button">X でシェアする</button>
            <button className="receipt-later" id="receipt-close" type="button">わたしの空へ戻る</button>
            <p className="stars-status" id="receipt-status" role="status" aria-live="polite" />
          </div>
        </section>
        <section className="stars-backdrop" id="fulfilled-sheet" role="dialog" aria-modal="true" aria-labelledby="fulfilled-title" hidden>
          <div className="stars-panel">
            <p className="sheet-kicker">叶ったよ</p>
            <h2 id="fulfilled-title">「叶ったよ」のひとこと（任意）</h2>
            <p className="stars-note">書くと、24時間だけ、みんなの空に流れ星として出ます。名前は出ません。</p>
            <textarea id="fulfilled-text" maxLength={24} aria-label="叶ったよ、のひとこと" placeholder="例：海を見に行けた" />
            <div className="input-meta"><span>ひとこと</span><span><b id="fulfilled-length">0</b> / 12</span></div>
            <button className="stars-primary" id="fulfilled-send" type="button">流れ星にして流す</button>
            <button className="stars-secondary" id="fulfilled-skip" type="button">今は流さない</button>
            <p className="stars-status" id="fulfilled-status" role="status" aria-live="polite" />
          </div>
        </section>
        {/* みんなの空（2026-10-12）。公開された願いを、天球の内側から見回す。わたしの空とは別の画面 */}
        <section className="everyone-view" id="everyone-view" role="dialog" aria-modal="true" aria-labelledby="everyone-title" hidden>
          <canvas id="everyone-canvas" aria-label="みんなの空。なぞると見回せて、つまむと近づけます。矢印キーで見回し、＋と−で近づけます。「次の願い」で1つずつ読めます" tabIndex={0} />
          <div className="everyone-top">
            <h2 id="everyone-title">みんなの空</h2>
            <button className="everyone-close" id="everyone-close" type="button">わたしの空へ</button>
          </div>
          <p className="everyone-hint">なぞって見回す　つまむか＋で近づく</p>
          <p className="everyone-empty" id="everyone-empty" role="status" hidden>まだ星がありません。「みんなの空に出す」を選んだ願いが、ここに灯ります</p>
          <div className="everyone-tools">
            <button id="everyone-zoom-out" type="button" aria-label="離れる">−</button>
            <button id="everyone-zoom-in" type="button" aria-label="近づく">＋</button>
            <button className="everyone-next" id="everyone-next" type="button">次の願い</button>
          </div>
          {/* 選んだ星の横に出す言葉（下にカードは出さない）。♡ と通報だけを添える */}
          <div className="everyone-card" id="everyone-card" role="group" aria-labelledby="everyone-kicker everyone-text" hidden>
            <p className="visually-hidden" id="everyone-kicker" />
            <p className="everyone-text" id="everyone-text" />
            <button className="everyone-heart" id="everyone-heart" type="button" aria-pressed="false" aria-label="ハートを送る">♡</button>
            <button className="everyone-more" id="everyone-more" type="button" aria-label="この言葉を通報する">…</button>
            <p className="everyone-status" id="everyone-status" role="alert" />
          </div>
          {/* マウスを当てた星の言葉（読むだけ） */}
          <p className="everyone-hover" id="everyone-hover" aria-hidden="true" hidden />
          <p className="visually-hidden" id="everyone-live" role="status" aria-live="polite" />
        </section>
        {/* 入口：はじめて開いた人にだけ、完成物（帰還票）と3つのステップを見せる（2026-10-11） */}
        <section className="intro-screen" id="intro-screen" role="dialog" aria-modal="true" aria-labelledby="intro-title" hidden>
          <div className="intro-inner">
            <p className="intro-brand">MORUNE <span>25143</span></p>
            <p className="title-kicker" lang="en">Leave your wish with the stars</p>
            <h2 id="intro-title">やりたいことを<br />星に預けておく</h2>
            <p className="intro-lead">預けた願いは　いつか帰ってくる</p>
            <div className="intro-sample">
              {/* eslint-disable-next-line @next/next/no-img-element -- 見本の帰還票（同梱の画像） */}
              <img src="/receipt-sample.png" alt="帰還票の見本" />
              <p><span>持ち帰れるもの</span>帰ってきた願いは<br />帰還票として現像される</p>
            </div>
            <ol className="intro-steps">
              <li>願いを星に預ける</li>
              <li>ある日、1つだけ帰ってくる</li>
              <li>帰還票が現像される</li>
            </ol>
            <button className="intro-start" id="intro-start" type="button">願いを預ける</button>
          </div>
        </section>
        <section className="location-backdrop" id="location-modal" role="dialog" aria-modal="true" aria-labelledby="location-title" aria-describedby="location-description">
          <div className="location-panel">
            <h2 id="location-title">今いる場所の星空を映します</h2>
            <p id="location-description">位置は送りません。帰ってきた場所だけを、小数1桁で端末に残し、帰還票に印字します。自分だけの記録です。許可しなくても東京の星空で使えます。</p>
            <button className="location-allow" id="location-allow" type="button">現在地の星空を見る</button>
            <button className="location-skip" id="location-skip" type="button">東京の星空で見る</button>
            <p className="location-status" id="location-status" role="status" aria-live="polite" />
          </div>
        </section>
      </main>
    </>
  );
}
