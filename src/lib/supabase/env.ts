/**
 * 未設定の環境変数を早い段階で検知する。
 * NEXT_PUBLIC_ の値はビルド時に置換されるため、呼び出し側で
 * process.env.NAME を直接書いて渡すこと（動的参照は置換されない）。
 */
export function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `環境変数 ${name} が設定されていません。.env.example を参照してください。`,
    );
  }
  return value;
}
