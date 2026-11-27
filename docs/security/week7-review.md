# 第7週 セキュリティ総点検

点検日：2026-11-27　対象：本番（https://enestu.vercel.app）と `main` のコード

## 結果の一覧

| 項目 | 点検の結果 | 対応 |
|---|---|---|
| 秘密の値の漏れ | 画面に届くファイル（14個）に、サービスロールの鍵などは無い | 問題なし |
| 依存パッケージ | `npm audit` で既知の脆弱性0件 | Dependabot alertsを有効にした |
| データの権限（RLS） | 全テーブルで有効。他人の行は読めず、書けない | 問題なし（DBテストで確認） |
| Cookie | セッションはHttpOnly・Secure・SameSite=Lax | 問題なし |
| CORS | 他のサイトからAPIを呼ぶ許可は出していない | 問題なし |
| プレビュー環境 | ログインしないと見られない（302） | 問題なし |
| GitHub | Secret scanningとPush protectionが有効 | 問題なし |
| セキュリティ用のヘッダー | 付いていなかった | CSPなど6つを付けた（下記） |
| 件数の上限 | 無かった。無償枠を使い切られるおそれ | 持ち主ごとに上限を付けた（下記） |
| メールの確認 | オフだった | Supabaseで「Confirm email」をオンにした |
| 使っていないコード | 画面用のSupabaseクライアントが残っていた | 削除した |
| 利用者の削除 | 手順が決まっていなかった | [手順書](../ops/delete-user.md)を作った |
| Supabase Security Advisor | 「Leaked Password Protection Disabled」の1件 | 受け入れる（下記） |

## 付けたヘッダー

本番だけで付ける（開発中は、作り直しの仕組みが `eval` を使うため付けない）。値は `src/lib/security-headers.ts`。

- `Content-Security-Policy`：読み込み先を自分のサイトとSupabaseに限る。ログインのフォームはSupabaseとGoogleへの送信だけ許す。埋め込みを禁止する。
- `X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff`、`Referrer-Policy: strict-origin-when-cross-origin`、`Permissions-Policy`（カメラ・マイク・位置情報など）、`Cross-Origin-Opener-Policy: same-origin`
- `X-Powered-By` は消した。

確かめたこと：E2Eで全画面・ログイン・写真・Realtimeが止められないこと。本物のGoogleログイン画面まで進めること。

## 件数の上限

普段の使い方では届かない値にした。超えるとAPIが429と理由を返す。値は `src/domain/limits.ts` とマイグレーションで合わせる。

| データ | 上限 |
|---|---|
| カード | 2,000枚 |
| 用語 | 1,000個 |
| 学習の記録 | 24時間で200件 |
| 解答 | 24時間で2,000件 |
| 説明 | 24時間で500件 |

## 受け入れたリスク

- **Leaked Password Protection**：Supabaseの有料プランの機能。ログインはGoogleだけで、パスワードを使っていないため影響は小さい。パスワードのログインを足すときに見直す。
- **端末IDの作り直し**：未ログインの上限は端末IDごとなので、IDを作り直せば上限から外れる。週に1回、SupabaseのDatabase使用量を見て、急に増えていないか確かめる。
