# エネスタ（EneStu）開発規範

人間とAIエージェントの両方が従う規範。8週間の垂直スライス開発で、毎週動くものを本番公開する。

## 1. 作業の進め方

1. **計画**：実装・ファイル編集の前に、必ず「変更計画」を提示する。
   - 作成・変更するファイル
   - DB設計（テーブル・カラム・RLS。変更がなければ「なし」と書く）
   - 確認方法
2. **承認**：開発者の承認を得てからコードを書く。承認された範囲を超える変更が必要になったら、止まって相談する。
3. **実装**：その週のスライスに必要なものだけを作る。
4. **検証**：下の「完了条件」をすべて満たしてから完了を報告する。失敗や未実施の項目は、そのまま報告する。

`git push`、本番DBへのマイグレーション適用、データの削除は、その都度承認を得る。

## 2. 完了条件

次のすべてがエラーゼロになるまで、修正を繰り返す。

```bash
npx tsc --noEmit   # 型検査
npm test           # Vitest
npm run lint       # ESLint
npm run build      # 本番ビルド
```

clone直後はNext.jsの型が未生成のため、`npx tsc --noEmit` の代わりに `npm run typecheck` を使う。

エラーを消すためのテストの削除・スキップ、`@ts-ignore`、ESLintルールの無効化は行わない。

## 3. 禁止事項

- `any` 型の使用（外部からの値は `unknown` で受け、検証してから使う）。
- 秘密鍵・APIキーのハードコード。値は `.env.local` とVercelの環境変数にだけ置く。
- 秘密の値への `NEXT_PUBLIC_` の付与。
- RLSを有効にしていないテーブルの作成。
- `src/lib/supabase/server.ts` のクライアントコンポーネントからの利用。
- 世界線ごとの画面コンポーネントの複製。

## 4. 技術スタック

| 領域 | 採用技術 |
|---|---|
| 画面 | Next.js（App Router）、TypeScript、Tailwind CSS（モバイルファースト・PWA） |
| バックエンド・DB | Supabase（PostgreSQL / Auth / Storage / Realtime） |
| 公開 | Vercel |
| テスト・CI | Vitest、Playwright、GitHub Actions（後の2つは導入予定） |

## 5. ディレクトリの役割

| 場所 | 役割 |
|---|---|
| `src/app/` | 画面とRoute Handler |
| `src/components/` | 世界線に依存しない共通UI |
| `src/domain/` | 計算ロジックの純粋関数 |
| `src/themes/` | 世界線のテーマ定義 |
| `src/lib/supabase/` | Supabase接続とDBの型 |
| `supabase/migrations/` | DBスキーマの変更履歴（SQL） |
| `docs/agents/` | 作業手順ごとの規範 |

## 6. 設計規則

### 計算ロジック
学習時間の集計・正答率・苦手判定・キーワード判定などは、UIやDBから分離し、`src/domain/` に純粋なTypeScript関数として置く。

- React・Next.js・Supabaseをimportしない。
- 現在時刻や乱数は引数で受け取る。
- 関数ごとに、境界値を含む単体テストを書く。

### 世界線
- `src/themes/` のテーマ定義オブジェクト（配色・キャラ・応援セリフ・UI用語）として定義し、`WorldTheme` 型を満たす。
- 配色はCSS変数（`--theme-*`）で切り替える。画面では `bg-primary` などのクラスを使い、色を直接書かない。
- 世界線で呼び方が変わる用語とセリフは、テーマ定義から取得する。
- 追加手順は [docs/agents/add-world.md](docs/agents/add-world.md) に従う。

### データアクセス
- 認証を導入する第5週までは、RLSを有効にして許可ポリシーを置かず、Route Handler経由でだけ読み書きする。
- Route Handlerでは入力を検証し、必ず端末IDで絞り込む。
- スキーマを変えたら `database.types.ts` を生成し直す。

## 7. 命名規約

| 対象 | 形式 | 例 |
|---|---|---|
| コンポーネントのファイル | PascalCase | `StudyTimer.tsx` |
| その他のTypeScriptファイル | kebab-case | `study-time.ts` |
| テスト | 対象と同じ場所に `.test.ts` | `study-time.test.ts` |
| 関数・変数 | camelCase | `sumStudyMinutes` |
| 型 | PascalCase | `WorldTheme` |
| DBのテーブル・カラム | snake_case（テーブルは複数形） | `study_sessions` |

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
