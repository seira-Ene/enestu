import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * 秘密の値を AES-256-GCM で暗号化する。サーバーでだけ使う。
 * 形は「版.初期化ベクトル.認証タグ.暗号文」（どれもbase64）。書き換えられたら戻せない。
 */

const VERSION = "v1";
const KEY_BYTES = 32;
const IV_BYTES = 12;

function keyFrom(base64: string): Buffer {
  const key = Buffer.from(base64, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error("暗号化の鍵は、32バイトをbase64で書いた値にしてください。");
  }
  return key;
}

export function sealSecret(plain: string, keyBase64: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(keyBase64), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), body]
    .map((part) => (typeof part === "string" ? part : part.toString("base64")))
    .join(".");
}

/** 戻せなければ（鍵が違う・書き換えられた・形が違う）null。 */
export function openSecret(sealed: string, keyBase64: string): string | null {
  const [version, iv, tag, body, ...rest] = sealed.split(".");
  if (version !== VERSION || rest.length > 0) return null;
  if (iv === undefined || tag === undefined || body === undefined) return null;
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      keyFrom(keyBase64),
      Buffer.from(iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(body, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
