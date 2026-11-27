import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { openSecret, sealSecret } from "./secret-box";

const key = randomBytes(32).toString("base64");
const otherKey = randomBytes(32).toString("base64");
const SECRET = "sample-secret-value-for-tests-1234";

describe("secret-box", () => {
  it("暗号化して、同じ鍵で戻せる。暗号文に元の値は含まれない", () => {
    const sealed = sealSecret(SECRET, key);
    expect(sealed).toMatch(/^v1\.[^.]+\.[^.]+\.[^.]+$/);
    expect(sealed).not.toContain(SECRET);
    expect(sealed).not.toContain("1234");
    expect(openSecret(sealed, key)).toBe(SECRET);
  });

  it("同じ値でも、毎回ちがう暗号文になる", () => {
    expect(sealSecret(SECRET, key)).not.toBe(sealSecret(SECRET, key));
  });

  it("別の鍵では戻せない", () => {
    expect(openSecret(sealSecret(SECRET, key), otherKey)).toBeNull();
  });

  it("書き換えられた暗号文は戻せない", () => {
    const [version, iv, tag, body] = sealSecret(SECRET, key).split(".");
    const flipped = Buffer.from(body ?? "", "base64");
    flipped[0] = (flipped[0] ?? 0) ^ 1;
    expect(openSecret([version, iv, tag, flipped.toString("base64")].join("."), key)).toBeNull();
    expect(openSecret(`v2.${iv}.${tag}.${body}`, key)).toBeNull();
    expect(openSecret("壊れた値", key)).toBeNull();
  });

  it("鍵が32バイトでなければ、暗号化しない", () => {
    expect(() => sealSecret(SECRET, randomBytes(16).toString("base64"))).toThrow(
      "暗号化の鍵は、32バイト",
    );
  });
});
