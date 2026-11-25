import type { CheerLines, NamedLines } from "@/themes/types";
import { fail, parseText, type ParseResult } from "./validation";

/** 上限は、DBの制約と合わせる。 */
export const MAX_HERO_NAME_LENGTH = 12;

/** 見えない文字や、文字の並ぶ向きを変える文字。なりすましに使われうる。 */
const INVISIBLE_PATTERN = /[\p{Cf}\p{Zl}\p{Zp}]/u;

/** 主人公の名前を検証する。空なら、名前なし（null）にする。 */
export function parseHeroName(value: unknown): ParseResult<string | null> {
  if (value === null) return { ok: true, value: null };
  const text = parseText(
    typeof value === "string" ? value.normalize("NFC") : value,
    { label: "名前", max: MAX_HERO_NAME_LENGTH, allowEmpty: true },
  );
  if (!text.ok) return text;
  if (INVISIBLE_PATTERN.test(text.value)) {
    return fail("名前に使えない文字が含まれています。");
  }
  return { ok: true, value: text.value === "" ? null : text.value };
}

/** セリフの {name} に、主人公の名前を入れる。 */
export function fillHeroName(
  [first, ...rest]: NamedLines,
  name: string,
): CheerLines {
  const fill = (line: string) => line.split("{name}").join(name);
  return [fill(first), ...rest.map(fill)];
}
