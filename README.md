# 25143 | HELLO EARTH

[アプリを開く](https://hello-earth-25143.maiko2223.chatgpt.site)

願いを星としてイトカワの軌道へ預け、スマホを振ると1つだけ地球へ帰還する体験です。帰還カプセルが運ぶのはイトカワの物質サンプルではなく、利用者が預けた願い星です。カプセルを開くと、預けたテキストと日付が表示され、地球側の回収記録に残ります。音声録音は行わず、願いは60字以内のテキストで保存します。

## 保存と同期

- ログイン前は願いを端末のブラウザ内に保存します。
- ChatGPTでログインすると、願いをSupabaseの`wishes`テーブルに保存し、同じChatGPTアカウントのスマホ間で同期します。
- 最初のログイン時、その端末内にある願いのテキストと状態をクラウドに取り込みます。
- ログインしていない端末のデータは自動では同期しません。

## 開発構成

- フロントエンド: `app/page.tsx` と `app/mission-experience.tsx` が画面を構成し、`app/mission-runtime.tsx` がReactの初回描画後に `public/mission.js` を読み込みます。宇宙と探査機はCanvas 2Dで描画します。
- サーバー側: `app/api/wishes/route.ts` がChatGPTのログイン情報を確認し、Supabase経由でユーザーごとに願いを分離します。
- データベース: Supabase Postgres。定義は `supabase/migrations/001_create_wishes.sql`。サービスロール鍵は `app/supabase.ts` 内でサーバー側からのみ利用します。
- 公開: Sites。GitHubはソース管理用で、GitHubからの自動デプロイは設定していません。

## Cloudflare Workers移行

- `wrangler.jsonc` と `.github/workflows/deploy-cloudflare.yml` がWorkers向けの独立デプロイ設定です。GitHub Actionsには `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を登録します。
- Workers版はログイン不要のゲスト利用を有効にし、願いを各端末のIndexedDBへ保存します。`CHATGPT_SYNC_ENABLED` を有効にした環境では、同じ画面の同期 API がSupabaseを利用します。
- WorkerへSupabaseを接続する場合は、次のSecretを登録します。値はGitへコミットしません。
	- `SUPABASE_URL`
	- `SUPABASE_SERVICE_ROLE_KEY`
- Supabase SQL Editorで `supabase/migrations/001_create_wishes.sql` を実行してから、Workerをデプロイします。
- 初回デプロイは `workers.dev` の検証用URLで行います。独自ドメインを使う場合は、Workers版の検証後にDNSとカスタムドメインを設定します。

## JAXA素材

- 実写候補: JAXAデジタルアーカイブス「『はやぶさ』が見たイトカワ」素材番号 `V100000166`。記録映像・写真、HDプレビュー5分25秒、クレジットはJAXA。
- [素材詳細と利用申請](https://jda.jaxa.jp/result.php?lang=j&id=39d086b9f5be1a96ed0600170d9fa87b)
- JAXAデジタルアーカイブスの案内では、個人のWebサイトへの掲載も利用申請の対象です。許諾が得られるまでは、アプリ内に素材を複製・掲載しません。許諾後に提供される素材と指定クレジットを使用してください。
- 現在のイトカワと探査機はCanvasによる仮描画です。JAXA実写は未掲載です。

公開版では、願いを預ける→軌道を周回する→振る／タップで1つ帰還→サンプルカプセルを開く、の操作を確認してください。端末間同期には両方の端末で同じChatGPTアカウントにログインします。
