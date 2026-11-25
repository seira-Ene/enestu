export type Json = Record<string, unknown>;

/** 外から届いた値を、確かめてから使う。 */
export function toRecord(value: unknown): Json {
  return typeof value === "object" && value !== null
    ? Object.fromEntries(Object.entries(value))
    : {};
}

export function parseJson(text: string): unknown {
  return text === "" ? {} : JSON.parse(text);
}

export function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}
