import "server-only";
import { createServerClient } from "@supabase/ssr";
import {
  isAuthRetryableFetchError,
  type AuthError,
} from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { parseAccount, type Account } from "@/domain/account";
import { ACCOUNT_MARKER } from "@/lib/account-marker";
import type { Database } from "./database.types";
import { requireEnv } from "./env";

/** ログインの状態を持つCookie。画面のJavaScriptからは読めない。 */
const SESSION_COOKIE = "enestu_session";
const MARKER_MAX_AGE = 400 * 24 * 60 * 60;

const COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
} as const;

export type SessionClient = Awaited<ReturnType<typeof createSessionClient>>;

export type Session = {
  readonly account: Account;
  /** 本人のトークンで接続する。RLSにより本人の行だけを扱える。 */
  readonly client: SessionClient;
};

/** Route Handler 専用。リクエストごとに作り、使い回さないこと。 */
export async function createSessionClient() {
  const store = await cookies();
  return createServerClient<Database>(
    requireEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    requireEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    {
      cookieOptions: {
        ...COOKIE_OPTIONS,
        name: SESSION_COOKIE,
        httpOnly: true,
      },
      cookies: {
        getAll: () => store.getAll(),
        setAll: (items) => {
          for (const { name, value, options } of items) {
            store.set(name, value, options);
          }
        },
      },
    },
  );
}

/**
 * 署名を確かめたログインを返す。未ログインか、切れていれば null。
 * 認証サーバーの不調は「未ログイン」と区別するため、例外にする。
 */
export async function readSession(): Promise<Session | null> {
  const store = await cookies();
  // 未ログインの利用者に、余計な処理をさせない。
  if (!store.getAll().some(({ name }) => isSessionCookie(name))) return null;

  const client = await createSessionClient();
  const { data, error } = await client.auth.getClaims();
  if (error && isOutage(error)) throw error;
  const account = parseAccount(data?.claims);
  return account && { account, client };
}

/** 画面用の印を、実際のログインに合わせる。 */
export async function saveAccountMarker(accountId: string): Promise<void> {
  const store = await cookies();
  store.set(ACCOUNT_MARKER, accountId, {
    ...COOKIE_OPTIONS,
    maxAge: MARKER_MAX_AGE,
  });
}

/** ログインの途中でだけ使う、合言葉のCookieを消す。 */
export function clearLoginAttempts(): Promise<void> {
  return deleteCookies((name) => name.startsWith(`${SESSION_COOKIE}-`));
}

/** ログインに関わるCookieをすべて消す。 */
export function clearSessionCookies(): Promise<void> {
  return deleteCookies(
    (name) => name === ACCOUNT_MARKER || name.startsWith(SESSION_COOKIE),
  );
}

async function deleteCookies(
  matches: (name: string) => boolean,
): Promise<void> {
  const store = await cookies();
  for (const { name } of store.getAll()) {
    if (matches(name)) store.delete({ ...COOKIE_OPTIONS, name });
  }
}

/** 長いと分割され、名前に「.0」「.1」が付く。 */
function isSessionCookie(name: string): boolean {
  return name === SESSION_COOKIE || name.startsWith(`${SESSION_COOKIE}.`);
}

function isOutage(error: AuthError): boolean {
  const status = error.status ?? 0;
  return isAuthRetryableFetchError(error) || status === 429 || status >= 500;
}
