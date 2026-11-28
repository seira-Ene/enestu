# 世界線の追加手順

1. `src/themes/types.ts` の `WORLD_IDS` にidを足す。
2. DBの `user_settings.world_id` と `gacha_items.world_id` の制約に、同じidを足すマイグレーションを作る。`gacha_items` には、`src/domain/gacha.ts` の `GACHA_SLOTS` の12枠を入れる。
3. `src/themes/<id>.ts` を作り、`as const satisfies WorldTheme` でテーマを定義する。
   - 配色は6桁・小文字の16進カラーにし、文字と背景の明暗差を4.5:1以上にする。
   - キャラクターとセリフはオリジナルにする。実在の作品や人物を使わない。
   - `dailyTotal` のセリフには `{minutes}`、クエストの `weak` と `neglected` には `{subject}`、`combo` には `{count}` を含める。
   - `namedWelcome`、`namedTalk`、`namedBurstTalk` のセリフには `{name}` を含める。
   - `burstTalk` は、何度も続けて押されたときのセリフ。4つ以上にし、`talk` と重ねない。
   - `gacha.prizes` に12枠すべての景品を書く。ノーマルとレアの `text` は素材の説明、スペシャルレアから上はキャラクターのセリフにする（「」は付けない）。
   - `character.greeting` に、さびしがるセリフ（`missed`、3つ以上）、おかえりのセリフ（`returned`、2つ以上）、連続日数のセリフ（`milestone`、3つ以上で `{days}` を含める）を書く。
   - `bgm` に、16小節（前半8小節・後半8小節で変化をつける）のオリジナル曲を書く（書き方と楽器は `src/domain/bgm.ts`）。既存の曲は使わない。どのパートもちょうど16小節にする。
   - `src/domain/sound.ts` の `WORLD_TAPS` に、キャラクターをタップしたときの音を足す（1秒以内。ほかの世界線と違う音にする）。
4. 次の登録表に足す（足りなければ型エラーになる）。
   - `src/themes/index.ts` の `themes`
   - `src/lib/world-fonts.ts` の `LOADERS`（フォントは `src/lib/fonts/<id>.ts`）
   - `src/components/characters/index.tsx` の `PORTRAITS`
   - `src/components/Backdrop.tsx` の `SCENES`
   - `src/components/StageArt.tsx` の `ARTS`
5. テストの追加は不要。`src/themes/themes.test.ts` が全世界線を検査する。新しい決まりを作ったら、ここに検査を足す。
6. 画面コンポーネントは変更・複製しない。変更が必要なら、`WorldTheme` 型の見直しを計画として提案する。
7. `AGENTS.md` の完了条件をすべて満たし、320pxと375pxの画面を目で確認する。

## キャラクターを自前の画像に替える

1. 顔（正方形320px）、一枚絵（16:10・幅896px）、横長（8:3・幅720px）、喜ぶ顔と泣き顔（縦長・幅640px。上の方を切り取って使う）のWebPを `public/characters/<id>-<種類>.webp` に置く。種類は face・scene・banner・happy・sad。1枚120KB未満にする。
2. テーマ定義の `character.images` を、`null` から5つのパスに変える。

権利を持つ画像だけを使う。
