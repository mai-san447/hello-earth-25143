# MORUNE 25143 | 願いのサンプルリターン

[公開アプリを開く](https://morune-25143.morune-25143.workers.dev/)

> 願いを星に、想いを地球へ。

願いを星としてイトカワの軌道へ預け、スマホを振ると1つだけ、はやぶさが地球へ連れ帰る体験です。
帰ってきた願いは「想いを受け取る／軌道へ戻す／アーカイブに保存」から選びます。今でなくてもいいなら、軌道へ戻せます。

## 誰の、どんな課題

入院や治療などで、やりたいことを一時的に手放さなければならない人が、戻ってきたときに1つずつ向き合えるようにする。
病室はネットがなく、休憩室には Wi-Fi がある、という場面を前提にしています。

## できること

- 願いを60字まで預ける（スマホのキーボード音声入力も使える）
- 振る／タップで、帰還の候補から1つだけ帰ってくる。判断せずに閉じても、次に開いたとき続きから選べる
- 帰還カードに、預けた日・待っていた日数・今日のイトカワまでの実際の距離（NASA/JPL Horizons）
- 帰還が始まる日を決めて預ける（その日までは振っても帰ってこない）
- 受け取った願いを、言葉の近さでつないだ星座（最小全域木・Prim 法）
- 応援の信号：応援リンクから誰かが振ると、軌道で待つ星が明るくなる（名前も言葉も届かない）。**本番ではデータベース未作成のため停止中**（Issue #10）
- 一度開けば、ネットのない病室でも開ける（Service Worker）。ホーム画面に追加できる

## 保存と通信

- 願いはこの端末のブラウザ（IndexedDB）にだけ保存します。本番は `CHATGPT_SYNC_ENABLED=false` で、ログイン同期は使っていません
- 画面と部品は Service Worker が端末に保存します（`public/sw.js`）
- 応援の信号を有効にした場合、サーバーに保存するのは「軌道ID（端末で作るランダムな UUID）と、信号が届いた時刻」だけです

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
- 手元で応援の信号を試すには、開発用の D1 に表を作ります：`drizzle/0001_signals.sql` を `wrangler d1 execute ... --local` で流す
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

## JAXA素材

- 実写候補: JAXAデジタルアーカイブス「『はやぶさ』が見たイトカワ」素材番号 `V100000166`。記録映像・写真、HDプレビュー5分25秒、クレジットはJAXA。
- [素材詳細と利用申請](https://jda.jaxa.jp/result.php?lang=j&id=39d086b9f5be1a96ed0600170d9fa87b)
- 許諾が得られるまでは、アプリ内に素材を複製・掲載しません。現在のイトカワと探査機は創作上の描画です。
