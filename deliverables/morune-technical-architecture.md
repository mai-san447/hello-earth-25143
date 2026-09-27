# MORUNE 25143｜技術構成

## 技術で実現していること

MORUNE 25143は、宇宙の距離感と「願いが帰ってくる」体験を、ブラウザーの標準APIとローカル保存を組み合わせて実現しています。

## 構成

- **フロントエンド**: React 19 + TypeScript + Vinext
- **公開基盤**: Cloudflare Workers
- **宇宙・星空表現**: Canvas 2D / Three.js
- **現在地との同期**: Geolocation APIで取得した位置を使い、星空の向きを調整
- **身体操作**: DeviceMotion APIでスマートフォンのシェイクを検知
- **操作フォールバック**: センサー非対応端末や権限未許可時は「タップで帰還」を利用
- **保存**: 公開版はIndexedDBへローカル保存。ログイン不要で利用可能
- **状態管理**: `waiting` → `returned` → `doing / waiting / done`
- **共有**: Web Share API。非対応ブラウザーではクリップボードへ共有文をコピー
- **API入口**: `GET/POST/DELETE /api/wishes`

## データの流れ

1. 利用者が願いを入力する
2. 願いを`waiting`状態でIndexedDBへ保存する
3. 星がイトカワの軌道を周回する
4. シェイクまたはタップで対象を1件選ぶ
5. 帰還演出後、`returned`状態へ更新する
6. 利用者の選択に応じて、取り組み中・軌道へ戻す・保存済みへ状態を更新する

## クラウド拡張

データアクセスのAPI契約を保ったまま、Supabase Postgresへ接続できる構成も実装しています。現在の公開版はゲスト利用を優先してIndexedDBで動作しており、Supabaseの本番Secret登録と認証済み同期は今後の拡張項目です。

## 一言で説明する場合

> CanvasとThree.jsで現在の星空とイトカワの軌道を描き、DeviceMotion APIでシェイクを検知し、IndexedDBで願いの状態を保存する、ローカルファーストなWebアプリです。
