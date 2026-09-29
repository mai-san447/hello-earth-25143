# Supabase接続手順

MORUNE 25143 のSupabase接続を完了するための手順です。コード変更はすでにGitHubへ反映済みです。

## 1. Supabaseプロジェクトを作成

1. [Supabase](https://supabase.com/dashboard) にログイン
2. `New project` を選択
3. プロジェクト名とデータベースパスワードを設定
4. プロジェクトの作成完了を待つ

## 2. テーブルを作成

1. Supabase Dashboardで対象プロジェクトを開く
2. 左メニューの `SQL Editor` を開く
3. 新しいSQLクエリを作成
4. リポジトリの [001_create_wishes.sql](../supabase/migrations/001_create_wishes.sql) の内容を貼り付けて `Run`
5. 左メニューの `Table Editor` に `wishes` テーブルが表示されることを確認

## 3. 接続情報を確認

Supabase Dashboardの `Project Settings` > `API` で次を確認します。

- `Project URL` が `SUPABASE_URL`
- `service_role` の秘密鍵が `SUPABASE_SERVICE_ROLE_KEY`

`service_role` は強い権限を持つため、ブラウザー、GitHub、README、チャットへ貼り付けません。

## 4. Cloudflare Workerへ登録

PowerShellでリポジトリのフォルダーから実行します。値の入力時はターミナルへ直接入力してください。

```powershell
cd C:\Work\Personal\hello-earth-25143
npx wrangler secret put SUPABASE_URL --config wrangler.jsonc
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config wrangler.jsonc
```

## 5. デプロイ

```powershell
cd C:\Work\Personal\hello-earth-25143
npm run build
npx wrangler deploy --config wrangler.jsonc
```

## 6. 見る場所

- 画面: `https://morune-25143.morune-25143.workers.dev/`
- データ: Supabase Dashboard > `Table Editor` > `wishes`
- API実装: [app/api/wishes/route.ts](../app/api/wishes/route.ts)
- Supabase接続入口: [app/supabase.ts](../app/supabase.ts)
- GitHub上の変更履歴: ブランチ `infra/cloudflare-workers-migration`

## 現在の動作モード

公開Workerは現在 `CHATGPT_SYNC_ENABLED=false` のため、未ログインの画面はIndexedDBへ保存します。SupabaseのAPI置換コードは完成していますが、ChatGPT認証を使う同期経路を実環境で検証するには、Supabase設定に加えて認証が有効な環境が必要です。
