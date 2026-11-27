import { describe, expect, it } from "vitest";
import { securityHeaders } from "./security-headers";

function policyOf(url: string | undefined): Map<string, string> {
  const csp = securityHeaders(url).find(
    ({ key }) => key === "Content-Security-Policy",
  );
  return new Map(
    (csp?.value ?? "").split("; ").map((part) => {
      const [name = "", ...rest] = part.split(" ");
      return [name, rest.join(" ")];
    }),
  );
}

describe("securityHeaders", () => {
  it("Supabaseと、その即時通信だけを読み込み先に加える", () => {
    const policy = policyOf("https://abc.supabase.co/");
    expect(policy.get("connect-src")).toBe(
      "'self' https://abc.supabase.co wss://abc.supabase.co",
    );
    expect(policy.get("img-src")).toBe(
      "'self' data: blob: https://abc.supabase.co",
    );
    expect(policy.get("form-action")).toBe(
      "'self' https://abc.supabase.co https://accounts.google.com",
    );
  });

  it("手元の試験用（http）では ws でつなぐ", () => {
    expect(policyOf("http://localhost:54999").get("connect-src")).toBe(
      "'self' http://localhost:54999 ws://localhost:54999",
    );
  });

  it.each([undefined, "not a url"])(
    "Supabaseの場所が分からなければ（%s）、自分のサイトだけにする",
    (url) => {
      const policy = policyOf(url);
      expect(policy.get("connect-src")).toBe("'self'");
      expect(policy.get("img-src")).toBe("'self' data: blob:");
    },
  );

  it("埋め込みを禁じ、外部のスクリプトとプラグインを許さない", () => {
    const policy = policyOf("https://abc.supabase.co");
    expect(policy.get("frame-ancestors")).toBe("'none'");
    expect(policy.get("object-src")).toBe("'none'");
    expect(policy.get("script-src")).toBe("'self' 'unsafe-inline'");
    expect(policy.get("default-src")).toBe("'self'");
  });

  it("ほかのヘッダーもそろっている", () => {
    expect(
      securityHeaders("https://abc.supabase.co").map(({ key }) => key),
    ).toEqual([
      "Content-Security-Policy",
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "Cross-Origin-Opener-Policy",
    ]);
  });
});
