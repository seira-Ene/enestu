# 世界線の追加手順

1. `src/themes/types.ts` の `WORLD_IDS` に対象のidがあることを確認する。
2. `src/themes/<id>.ts` を作り、`as const satisfies WorldTheme` でテーマを定義する。
   - 配色は6桁・小文字の16進カラーにする。
   - キャラクターとセリフはオリジナルにする。実在の作品や人物を使わない。
   - `dailyTotal` のセリフには `{minutes}` を含める。
3. `src/themes/index.ts` の `themes` に登録する。
4. `src/themes/<id>.test.ts` を `dungeon.test.ts` と同じ観点で作る。
5. 画面コンポーネントは変更・複製しない。変更が必要なら、`WorldTheme` 型の見直しを計画として提案する。
6. `AGENTS.md` の完了条件をすべて満たす。
