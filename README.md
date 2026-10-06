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

仮説：やりたいことを1つずつ帰すと、一覧で全部見るより向き合う負担が減る。「軌道へ戻す」があると、今できないことを責めずに先送りできる。
確かめ方：5人に説明なしで触ってもらい、最後まで通るか・決めやすさ（1〜5）・聞き取りを記録する。数は端末の中だけで数え、願いの中身は集めない。

---

願いを星としてイトカワの軌道へ預け、スマホを振ると1つだけ、はやぶさが地球へ連れ帰る体験です。
帰ってきた願いは「想いを受け取る／軌道へ戻す／アーカイブに保存」から選びます。今でなくてもいいなら、軌道へ戻せます。

## 誰の、どんな課題

療養・休職・育休・介護などで**しばらく離れる人**が、手放したやりたいことに、戻ってきたときに1つずつ向き合えるようにする。
困りごとは2つ。離れている間にやりたいことが消えてしまう気がする／戻ったとき多すぎて選べない。
離れている間は、電波が弱い・ない場所（病室、移動中、実家など）にいることもある。ネットがなくても動くことを前提にしています。

## できること

- 願いを60字まで預ける（スマホのキーボード音声入力も使える）
- 振る／タップで、帰還の候補から1つだけ帰ってくる。判断せずに閉じても、次に開いたとき続きから選べる
- 帰還カードに、預けた日・待っていた日数・今日のイトカワまでの実際の距離（NASA/JPL Horizons）
- 帰還が始まる日を決めて預ける（その日までは振っても帰ってこない）
- 受け取った願いを、言葉の近さでつないだ星座（最小全域木・Prim 法）
- 応援の信号：応援リンクから誰かが振ると、軌道で待つ星が明るくなる（名前も言葉も届かない）。本番で動いている（2026-10-05〜、Issue #10）
- 一度開けば、ネットがない場所でも開ける（Service Worker）。ホーム画面に追加できる
- 願いが育つ：受け取った願いは6等星から始まり、小さな一歩をふみ出すたび（1日1回）明るくなって1等星へ。「叶った」で叶った星になる。暗くはならない（2026-10-05 本番公開）
- みんなの星：選んだ願いだけを名前を出さずに星空に流し、他の人の星に応援の信号を送れる。「叶ったよ」は24時間の流れ星。はじめて流すと枝番（25143-0001 など、この作品の中だけの番号）が付く。**本番では止めている**（`PUBLIC_STARS_ENABLED` が `"false"`。投稿を見守る人がいない期間は開かない。審査では手元か録画で見せる。Issue #22・#23）

## 作者の番号（25143-0000）

人の番号は 25143-0001 から順に発行し、作者だけは 25143-0000 にする。作者の端末の軌道ID（回収記録の「応援リンク」の `?to=` のあと）を使って、次を1回実行する。

```bash
npx wrangler d1 execute morune-25143 --remote --command "INSERT INTO orbits (id, number, created_at) VALUES ('<作者の軌道ID>', 0, unixepoch() * 1000) ON CONFLICT(id) DO UPDATE SET number = 0"
```

作者の端末では、localStorage の `morune-25143-orbit-number` を消して開き直すと、新しい番号（25143-0000）を受け取る。

## 保存と通信

- 願いはこの端末のブラウザ（IndexedDB）にだけ保存します。本番は `CHATGPT_SYNC_ENABLED=false` で、ログイン同期は使っていません
- 画面と部品は Service Worker が端末に保存します（`public/sw.js`）
- 応援の信号を有効にした場合、サーバーに保存するのは「軌道ID（端末で作るランダムな UUID）と、信号が届いた時刻」だけです
- みんなの星を有効にした場合、本人が「星空に流す」を選んだ言葉と軌道IDを保存します（名前・IP は保存しません）。願い30日・叶ったよ24時間で空から消えます

## 構成

| 役割 | 場所 |
| --- | --- |
| 画面の骨組み | `app/page.tsx`、`app/mission-experience.tsx`（`app/mission-runtime.tsx` が `public/mission.js` を読み込む） |
| 画面の動き・演出 | `public/mission.js`。3D 星空は Three.js（読めなければ Canvas 2D の簡易表示） |
| 願いの状態遷移 | `public/wish-state.js`（設計は `docs/状態設計.md`） |
| オフライン | `public/sw.js`、`public/offline-routes.js`、`public/manifest.webmanifest` |
| イトカワの距離 | `public/itokawa.js`、`public/itokawa-distance.json` |
| 星座・信号の数え方 | `public/constellation.js` |
| 応援の信号 | `app/api/signals/`（Cloudflare D1 の `signals` 表、`drizzle/0001_signals.sql`）、応援ページ `app/signal/`・`public/signal.js` |
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
- 手元で応援の信号・みんなの星を試すには、開発用の D1 に表を作ります：`drizzle/0001_signals.sql` と `drizzle/0002_public_stars.sql` を `wrangler d1 execute ... --local` で流す（開発サーバーの D1 は `vite.config.ts` の `site-creator-d1` なので、その設定で流す）
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
- 応援の信号を本番で使う手順は `docs/状態設計.md`（Issue #10）

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
