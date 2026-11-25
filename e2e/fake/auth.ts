import {
  createHash,
  generateKeyPairSync,
  randomUUID,
  sign,
  verify,
} from "node:crypto";
import { parseJson, toRecord, toText, type Json } from "./json";

export type FakeUser = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
};

type Reply = {
  readonly status: number;
  readonly body?: unknown;
  readonly location?: string;
};

const KEY_ID = "e2e";
const TOKEN_SECONDS = 3600;

/** GoTrue（Supabaseの認証）のうち、Googleログインに使う部分だけをまねる。 */
export class FakeAuth {
  private readonly keys = generateKeyPairSync("ec", { namedCurve: "P-256" });
  private readonly codes = new Map<
    string,
    { user: FakeUser; challenge: string }
  >();
  private readonly refreshTokens = new Map<string, FakeUser>();
  /** 次に「Googleでログイン」した人。null なら、やめたことにする。 */
  nextUser: FakeUser | null = null;

  handle(path: string, query: URLSearchParams, body: string): Reply {
    switch (path) {
      case ".well-known/jwks.json":
        return { status: 200, body: { keys: [this.publicJwk()] } };
      case "authorize":
        return this.authorize(query);
      case "token":
        return this.exchange(query.get("grant_type"), parseJson(body));
      case "logout":
        return { status: 204 };
      default:
        return { status: 404, body: {} };
    }
  }

  /** 署名と期限を確かめ、利用者のIDを返す。 */
  verifyToken(token: string): string | null {
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature) return null;
    const isValid = verify(
      "sha256",
      Buffer.from(`${header}.${payload}`),
      { key: this.keys.publicKey, dsaEncoding: "ieee-p1363" },
      Buffer.from(signature, "base64url"),
    );
    if (!isValid) return null;
    const claims = toRecord(
      parseJson(Buffer.from(payload, "base64url").toString()),
    );
    return Number(claims.exp) * 1000 > Date.now() ? toText(claims.sub) : null;
  }

  private publicJwk(): Json {
    return {
      ...this.keys.publicKey.export({ format: "jwk" }),
      kid: KEY_ID,
      alg: "ES256",
      use: "sig",
      key_ops: ["verify"],
    };
  }

  /** Googleの画面の代わりに、すぐアプリへ戻す。 */
  private authorize(query: URLSearchParams): Reply {
    const back = new URL(query.get("redirect_to") ?? "");
    if (this.nextUser === null) {
      back.searchParams.set("error", "access_denied");
    } else {
      const code = randomUUID();
      this.codes.set(code, {
        user: this.nextUser,
        challenge: query.get("code_challenge") ?? "",
      });
      back.searchParams.set("code", code);
    }
    return { status: 302, location: back.href };
  }

  private exchange(grantType: string | null, body: unknown): Reply {
    const fields = toRecord(body);
    if (grantType === "refresh_token") {
      const user = this.refreshTokens.get(toText(fields.refresh_token));
      return user ? this.session(user) : failed("refresh_token_not_found");
    }
    const code = toText(fields.auth_code);
    const found = this.codes.get(code);
    this.codes.delete(code);
    const challenge = createHash("sha256")
      .update(toText(fields.code_verifier))
      .digest("base64url");
    return found?.challenge === challenge
      ? this.session(found.user)
      : failed("bad_code_verifier");
  }

  private session(user: FakeUser): Reply {
    const refreshToken = randomUUID();
    this.refreshTokens.set(refreshToken, user);
    const now = Math.floor(Date.now() / 1000);
    const profile = {
      email: user.email,
      user_metadata: { full_name: user.name },
    };
    return {
      status: 200,
      body: {
        access_token: this.signToken({
          ...profile,
          sub: user.id,
          role: "authenticated",
          aud: "authenticated",
          iat: now,
          exp: now + TOKEN_SECONDS,
          session_id: randomUUID(),
        }),
        token_type: "bearer",
        expires_in: TOKEN_SECONDS,
        expires_at: now + TOKEN_SECONDS,
        refresh_token: refreshToken,
        user: {
          ...profile,
          id: user.id,
          aud: "authenticated",
          role: "authenticated",
          app_metadata: { provider: "google" },
          created_at: new Date().toISOString(),
        },
      },
    };
  }

  private signToken(claims: Json): string {
    const encode = (value: Json) =>
      Buffer.from(JSON.stringify(value)).toString("base64url");
    const content = `${encode({ alg: "ES256", kid: KEY_ID, typ: "JWT" })}.${encode(claims)}`;
    const signature = sign("sha256", Buffer.from(content), {
      key: this.keys.privateKey,
      dsaEncoding: "ieee-p1363",
    });
    return `${content}.${signature.toString("base64url")}`;
  }
}

function failed(code: string): Reply {
  return { status: 400, body: { error_code: code, msg: code } };
}
