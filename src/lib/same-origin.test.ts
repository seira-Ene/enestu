import { describe, expect, it } from "vitest";
import { readSameOrigin } from "./same-origin";

function from(headers: Record<string, string>): string | null {
  return readSameOrigin(new Request("http://internal/", { headers }));
}

describe("readSameOrigin", () => {
  it.each([
    ["https://enestu.example", "enestu.example"],
    ["http://localhost:3000", "localhost:3000"],
  ])("自分のサイト（%s）からなら、起点を返す", (origin, host) => {
    expect(from({ origin, host })).toBe(origin);
  });

  it.each([
    ["別のサイト", "https://evil.example", "enestu.example"],
    ["続きのある名前", "https://enestu.example.evil", "enestu.example"],
    ["下位のサイト", "https://x.enestu.example", "enestu.example"],
    ["別のポート", "http://localhost:3001", "localhost:3000"],
    ["隠された起点", "null", "enestu.example"],
    ["空の起点", "", "enestu.example"],
  ])("%s からは受け付けない", (_label, origin, host) => {
    expect(from({ origin, host })).toBeNull();
  });

  it("起点がわからなければ受け付けない", () => {
    expect(from({ host: "enestu.example" })).toBeNull();
    expect(from({ origin: "https://enestu.example" })).toBeNull();
  });
});
