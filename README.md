# MORUNE 25143 | 願いのサンプルリターン

[公開アプリを開く](https://morune-25143.morune-25143.workers.dev/)

> 願いを星に、想いを地球へ。

## 卒業制作HQ

GS 卒業制作（**2026-10-07 提出**）の入口。ここから全部たどれます。

| 見たいもの | 場所 |
| --- | --- |
| 動くもの（本番） | https://morune-25143.morune-25143.workers.dev/ |
| やること・進み具合（看板） | [GitHub Projects「MORUNE 25143 卒業制作」](https://github.com/users/mai-san447/projects/2)（優先度・カテゴリ・目安・締め切りつき） |
| やることの一覧 | [Issues](https://github.com/mai-san447/hello-earth-25143/issues) |
| 変更のまとめとレビュー | [Pull Request #18](https://github.com/mai-san447/hello-earth-25143/pull/18) |
| 何を作るか | [機能要件](docs/機能要件.md) |
| どう使うか | [ユーザーフロー](docs/ユーザーフロー.md) |
| 画面と見た目 | [画面仕様・UIデザイン仕様](docs/画面仕様.md) |
| 状態の動き（対話設計の型） | [状態設計](docs/状態設計.md) |
| 効いたかの確かめ方 | [検証計画](docs/検証計画.md)（Issue #20） |
| GGA に向けた次の設計（メンター会 9/30） | [みんなの星（匿名の共有）](docs/みんなの星_設計.md)（Issue #22〜#25） |
| 似たサービスの成功と失敗・最新の宇宙の話題 | [類似サービス調査](docs/類似サービス調査.md) |
| AI への指示・レビューの観点 | [AGENTS.md](AGENTS.md) |

### 日程

| 日付 | できごと |
| --- | --- |
| 10/3(土) 12:00〜12:30 | GGA・セレクション説明会（オンライン、録画あり） |
| **10/7(水) 23:59** | **卒業制作の締め切り（必着）** |
| 10/14(水)〜10/18(日) | GGA セレクション（校内オーディション、オンライン） |
| 10/21(水) | GGA 出場者の決定 |
| 10/24(土) | 卒制お披露目会（オンライン） |
| 10/25(日) | 卒業式 |
| 11/16(月) 夕方〜 | GGA 本番（東京カルチャーカルチャー、渋谷） |

### 検証・評価（要約）

仮説：やりたいことを1つずつ帰すと、一覧で全部見るより向き合う負担が減る。「もう少し預ける」があると、今できないことを責めずに先送りできる。
確かめ方：5人に説明なしで触ってもらい、最後まで通るか・決めやすさ（1〜5）・聞き取りを記録する。数は端末の中だけで数え、願いの中身は集めない。

---

願いを本物の星空の星として預け、スマホを振ると1つだけ、はやぶさが地球へ連れ帰る体験です。
帰ってきた願いは「想いを受け取る／もう少し預ける」から選びます。今でなくてもいいなら、もう少し星に預けておけます。

## 誰の、どんな課題

療養・休職・育休・介護などで**しばらく離れる人**が、手放したやりたいことに、戻ってきたときに1つずつ向き合えるようにする。
困りごとは2つ。離れている間にやりたいことが消えてしまう気がする／戻ったとき多すぎて選べない。
離れている間は、電波が弱い・ない場所（病室、移動中、実家など）にいることもある。ネットがなくても動くことを前提にしています。

## できること

- 願いを60字まで預ける（スマホのキーボード音声入力も使える）
- ホームは本物の星図。今いる場所と時刻の星空（Yale BSC の5,080個）を、天の北極を中心に描く。上の帯は「緯度経度　時刻」だけ。位置は端末の中だけで使い、断られたら東京で描く
- 預けた願いは金色の星（やわらかい光と細い十字の光）で星図に灯る。預けるときは地球から星へ、帰るときは星から地球へ飛ぶ
- 下のボタンは「願いを星に預ける」がいつも出る。帰せるときだけ「シグナルを探す」（振る）と「タップで帰還」が出て、カプセルが着地すると同じボタンが「カプセルを開く」になる
- 振る／タップで、帰還の候補から1つだけ帰ってくる。判断せずに閉じても、次に開いたとき続きから選べる
- 帰還カードの選択肢は「想いを受け取る」「もう少し預ける」の2つだけ
- 想いを受け取ると、帰還票をつくるシートが出る。帰還票には MORUNE 25143 と番号、星のドット絵（ガチャ。まれに流れ星）、願いの言葉（はじめは入れる。外せる）、「預けた日 → 帰ってきた日」と 25143 までの距離、サービスへの QR、切り取り線、最初の小さな一歩（なければ書く線）、「距離：NASA/JPL Horizons」が入る
- 「X でシェアする」で X の投稿画面をすぐ開く（共有先は X だけ）。文は「願い」（選んだときだけ）＋「星に預けていた願いを、やってみることにした。」＋ #MORUNE25143 ＋サービスのURL。帰還票の画像は端末に保存されるので、投稿に添える
- 帰還が始まる日を決めて預ける（その日までは振っても帰ってこない）
- 一度開けば、ネットがない場所でも開ける（Service Worker）。ホーム画面に追加できる
- 願いが育つ：受け取った願いは6等星から始まり、小さな一歩をふみ出すたび（1日1回）明るくなって1等星へ。「叶った」で叶った星になる。暗くはならない（2026-10-05 本番公開）
- 回収記録：帰ってきた願いの一覧が先頭。そこで育てる・叶ったを記録する。削除とリセットは「整理する」の中にたたむ。その下に番号と「あなたの記録」（たたんである）、いちばん下に利用規約。開いている間は下のボタンを隠す
- みんなの星：選んだ願いだけを名前を出さずに星空に流す。「叶ったよ」は24時間の流れ星。**次期バージョンの機能で、本番では止めている**（`PUBLIC_STARS_ENABLED` が `"false"`。止めている間、画面は `/api/stars` に問い合わせない。Issue #22・#23）
- 2026-10-07 にやめたもの：応援の信号と応援リンク（`/signal` の画面と `/api/signals` の受け口を消した）、星座の線と軌道の線、願いの絵（AI）の画面、ログインの入口、タブ

## 作者の番号（25143-0000）

人の番号は 25143-0001 から順に発行し、作者だけは 25143-0000 にする。**表を作った直後、番号を配り始める公開の前に**、作者の端末の軌道ID（ブラウザの開発者ツールで、localStorage の `morune-25143-orbit-id` の値）を使って次を1回実行する。
番号は「今ある最大の番号＋1」で配るので、配り始めたあとに作者の番号を 0 に変えると、空いた番号が次の人に二重に配られる。配り始めたあとに直すときは、作者の番号は変えずに相談する。

```bash
npx wrangler d1 execute morune-25143 --remote --command "INSERT INTO orbits (id, number, created_at) VALUES ('<作者の軌道ID>', 0, unixepoch() * 1000) ON CONFLICT(id) DO UPDATE SET number = 0"
```

作者の端末では、localStorage の `morune-25143-orbit-number` を消して開き直すと、新しい番号（25143-0000）を受け取る。

## 保存と通信

- 願いはこの端末のブラウザ（IndexedDB）にだけ保存します。本番は `CHATGPT_SYNC_ENABLED=false` で、ログイン同期は使っていません
- 画面と部品は Service Worker が端末に保存します（`public/sw.js`）
- ふだんの使い方でサーバーに送るのは、人の番号の発行（`POST /api/orbits`）だけです。保存するのは「軌道ID（端末で作るランダムな UUID）と、発行した時刻」です
- 願いの言葉はどこにも送りません。願いの絵（AI）はやめました（`/api/art` は `ART_ENABLED` が `"true"` のときだけ動き、本番では動きません）
- みんなの星（次期バージョン）を有効にした場合だけ、本人が「星空に流す」を選んだ言葉と軌道IDを保存します（名前・IP は保存しません）。願い30日・叶ったよ24時間で空から消えます

## 構成

| 役割 | 場所 |
| --- | --- |
| 画面の骨組み | `app/page.tsx`、`app/mission-experience.tsx`（`app/mission-runtime.tsx` が `public/mission.js` を読み込む） |
| 画面の動き・演出 | `public/mission.js`。3D 星空は Three.js（読めなければ Canvas 2D で同じ星図） |
| 星図の計算 | `public/sky.js`、`public/sky-stars.json`（Yale BSC）、`public/itokawa-radec.json` |
| 帰還票 | `public/receipt.js`（中身）、`public/vendor/`（QR の部品） |
| 願いの状態遷移 | `public/wish-state.js`（設計は `docs/状態設計.md`） |
| オフライン | `public/sw.js`、`public/offline-routes.js`、`public/manifest.webmanifest` |
| イトカワの距離 | `public/itokawa.js`、`public/itokawa-distance.json` |
| 人の番号 | `app/api/orbits/`（D1 の `orbits` 表、`drizzle/0003_orbits.sql`） |
| 信号の上限の部品 | `app/api/signals/rules.mjs`・`record.ts`（応援の信号は廃止。みんなの星が使う共通の部品として残す） |
| みんなの星 | `app/api/stars/`（数とルールは `rules.mjs`）、`public/public-stars.js`、D1 の `orbits`・`public_stars`・`star_reports` 表（`drizzle/0002_public_stars.sql`） |
| ログイン同期（本番では停止） | `app/api/wishes/route.ts`、Supabase（`docs/SUPABASE-SETUP.md`） |

## 開発

Node.js 22 以上。

```bash
npm ci
npm run dev      # 手元の開発サーバー
npm test         # テスト（node --test）
npm run lint
npm run build
```

- 手元の開発サーバーは、`vite.config.ts` で互換日を手元の Miniflare に合わせて下げています（本番の設定は `wrangler.jsonc`）
- 手元で番号・みんなの星を試すには、開発用の D1 に表を作ります：`drizzle/0002_public_stars.sql` と `drizzle/0003_orbits.sql` を `wrangler d1 execute ... --local` で流す（開発サーバーの D1 は `vite.config.ts` の `site-creator-d1` なので、その設定で流す）
- push と Pull Request のたびに、GitHub Actions（`.github/workflows/ci.yml`）がテスト・lint・ビルドを確かめます

## 公開

本番（workers.dev）は、今は**手元の PC から手動で公開**しています。

```bash
npm test
npm run build
npx wrangler deploy --config wrangler.jsonc
```

- 戻すとき：`npx wrangler deployments list --config wrangler.jsonc` で版を確かめ、`npx wrangler rollback <版ID>`
- `.github/workflows/deploy-cloudflare.yml`（main への push で公開）は、GitHub に鍵が未登録のため動いていません。main への取り込みと公開手順の整理は Issue #9

## 保留・通報された言葉の確認

みんなの星で「保留（held）」になった言葉と、通報で「非表示（hidden）」になった言葉は、運営者（本人）が確かめて表示・非表示を決めます。管理画面はまだないので、手元の PC から SQL で行います。**本番のデータを触るので、落ち着いて1つずつ。**

一覧を見る（新しい順）：

```bash
npx wrangler d1 execute morune-25143 --remote --command "SELECT id, kind, status, reports, text, datetime(created_at/1000, 'unixepoch', '+9 hours') AS created_jst, datetime(expires_at/1000, 'unixepoch', '+9 hours') AS expires_jst FROM public_stars WHERE status IN ('held', 'hidden') ORDER BY created_at DESC LIMIT 50"
```

表示に戻す／非表示にする（`<星のid>` を一覧の id に置き換える）：

```bash
npx wrangler d1 execute morune-25143 --remote --command "UPDATE public_stars SET status = 'visible' WHERE id = '<星のid>'"
npx wrangler d1 execute morune-25143 --remote --command "UPDATE public_stars SET status = 'hidden' WHERE id = '<星のid>'"
```

- 通報で非表示になった言葉を表示に戻すときは、通報数も 0 に戻す：`UPDATE public_stars SET status = 'visible', reports = 0 WHERE id = '<星のid>'`（通報した端末の記録 `star_reports` は残すので、同じ端末からの二重の通報は数えない）
- 消すとき（取り返しがつかない）：`DELETE FROM star_reports WHERE star_id = '<星のid>'` → `DELETE FROM public_stars WHERE id = '<星のid>'`

書き出し（バックアップ。1つの外部サービスが止まっても、公開された言葉を手元に残す）：

```bash
npx wrangler d1 export morune-25143 --remote --output backup-$(date +%Y-%m-%d).sql
```

書き出したファイルには公開された言葉が入るので、Git にコミットしない。

## JAXA素材

- 実写候補: JAXAデジタルアーカイブス「『はやぶさ』が見たイトカワ」素材番号 `V100000166`。記録映像・写真、HDプレビュー5分25秒、クレジットはJAXA。
- [素材詳細と利用申請](https://jda.jaxa.jp/result.php?lang=j&id=39d086b9f5be1a96ed0600170d9fa87b)
- 許諾が得られるまでは、アプリ内に素材を複製・掲載しません。現在のイトカワと探査機は創作上の描画です。


## 本物の星空（2026-10-07）

### 北極中心の星図

ホームの恒星と願いは、天の北極を中心とする正距方位図法（星座早見盤のような形）で表示する。赤緯40度までの半径50度を短辺の45%に収め、地方恒星時に合わせて反時計回りに回す。上が南中する側、下が北の地平線側。北極星は中心から約0.74度離れた本来の位置に置く。背景の星と願いは同じ投影を使い、地平線の下も少し暗くして残す。Three.js が使えない場合も同じ星図を Canvas 2D で描く。

`public/sky.js` が端末の時刻と位置から恒星時・高度・方位を計算する。位置は送信も保存もしない。断られたとき・使えないときは東京（35.68, 139.76）。同梱データを使い、1分ごとと画面に戻ったときに描き直す。願いの状態遷移には影響しない。端末の向きとは連動しない。昼間も星を出し、大気差・歳差・地形は含めない。上の帯は「緯度経度　時刻」だけ（「北の空」とは書かない）。

願いは番号の順に、北斗七星・カシオペヤ座・こぐま座の星の位置に金色で灯る（やわらかい光と細い十字の光）。星座の線と願いの軌道の線は描かない（2026-10-07）。大きなイトカワとはやぶさは演出で、小さな水色の印が 25143 の実際の方向（地平線の上にあるときだけ）。データが読めなくても願いは使え、つながったあとに読み直せる。

投影は `public/sky.js`、検証は `tests/polar-sky.test.mjs`・`tests/north-render.test.mjs`・`tests/sky.test.mjs`。

恒星：Yale Bright Star Catalogue（Hoffleit & Warren 1991）、[VizieR V/50](https://cdsarc.cds.unistra.fr/viz-bin/cat/V/50)、6等級まで5080個（肉眼で見える星ほぼすべて）。VizieR catalogue access tool, CDS, Strasbourg, France（DOI: 10.26093/cds/vizier）に謝意を表します。イトカワ：[NASA/JPL Horizons](https://ssd.jpl.nasa.gov/horizons/)、地心ICRF赤経・赤緯、2026-10-01〜2027-12-31の毎日00:00 UT、線形補間（赤経の0度折り返しを考慮）。期間外は外挿しない。JSとJSONをService Workerで保存し、実行時に外部の天文APIへ問い合わせない。
