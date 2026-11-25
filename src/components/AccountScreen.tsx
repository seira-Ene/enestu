"use client";

import { useSearchParams } from "next/navigation";
import { AccountPanel } from "./AccountPanel";
import { useAccount } from "./AccountProvider";
import { ALERT, HEADING, PANEL } from "./form-styles";
import { HeroNamePanel } from "./HeroNamePanel";
import { ScreenHeader } from "./ScreenHeader";
import { ScreenLayout } from "./ScreenLayout";

export function AccountScreen() {
  const { data } = useAccount();
  const login = useSearchParams().get("login");
  const isSignedIn = data?.kind === "signed_in";

  return (
    <ScreenLayout>
      <ScreenHeader title="アカウント" subtitle="記録の持ち主" />
      {login === "ok" && isSignedIn && (
        <p role="status" className={`panel ${ALERT}`}>
          ログインしました。
        </p>
      )}
      {login === "failed" && !isSignedIn && (
        <p role="alert" className={`panel ${ALERT}`}>
          ログインできませんでした。ログインを始めたときと同じブラウザで、もう一度試してください。
        </p>
      )}
      {login === "cancelled" && !isSignedIn && (
        <p role="status" className={`panel ${ALERT}`}>
          ログインをやめました。
        </p>
      )}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-5">
          <AccountPanel justSignedIn={login === "ok"} />
          <HeroNamePanel />
        </div>
        <PrivacyNote />
      </div>
    </ScreenLayout>
  );
}

function PrivacyNote() {
  return (
    <section aria-labelledby="privacy-title" className={PANEL}>
      <h2 id="privacy-title" className={HEADING}>
        保存する情報
      </h2>
      <dl className="flex flex-col gap-3 text-sm">
        <div>
          <dt className="font-bold">Googleから受け取るもの</dt>
          <dd>
            名前、メールアドレス、プロフィール画像の場所、Googleの利用者番号。パスワードは受け取りません。
          </dd>
        </div>
        <div>
          <dt className="font-bold">ログインで記録されるもの</dt>
          <dd>日時、接続元のIPアドレス、ブラウザの種類。</dd>
        </div>
        <div>
          <dt className="font-bold">このアプリで付けたもの</dt>
          <dd>学習の記録、カード、解答、選んだ世界線、主人公の名前、写真とメモ。</dd>
        </div>
        <div>
          <dt className="font-bold">写真とメモの扱い</dt>
          <dd>
            写真は送る前に端末で縮め、撮影場所などの情報を除きます。見られるのは本人だけですが、写真を開いたときのURLは1時間ほど、知っている人なら開けます。消すと、写真も置き場から消します。
          </dd>
        </div>
        <div>
          <dt className="font-bold">使い道</dt>
          <dd>
            本人の確認と、記録の表示だけに使います。広告には使いません。保存先はSupabase、公開にはVercelを使っています。
          </dd>
        </div>
        <div>
          <dt className="font-bold">消したいとき</dt>
          <dd>
            写真とメモは、メモの画面で消せます。アカウントとほかの記録は、画面からはまだ消せません。このアプリを紹介した開発者に伝えてください。まとめて消します。
          </dd>
        </div>
      </dl>
    </section>
  );
}
