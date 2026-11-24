import { useSyncExternalStore } from "react";
import { isInAppBrowser } from "@/domain/in-app-browser";
import { ALERT, PRIMARY_BUTTON } from "./form-styles";

type Props = {
  /** 計測中など、ログインすると記録の持ち主が紛らわしくなるとき。 */
  isBlocked: boolean;
};

/** Googleのログイン画面へ移るボタン。 */
export function LoginForm({ isBlocked }: Props) {
  const isInApp = useSyncExternalStore(
    subscribeNever,
    () => isInAppBrowser(navigator.userAgent),
    () => false,
  );

  return (
    <form method="post" action="/auth/login" className="flex flex-col gap-3">
      {isInApp && (
        <p className={ALERT}>
          アプリの中のブラウザでは、Googleがログインを受け付けません。SafariやChromeで開いてください。ここで付けた記録は、ほかのブラウザからは引き継げません。
        </p>
      )}
      <button type="submit" disabled={isBlocked} className={PRIMARY_BUTTON}>
        Googleでログイン
      </button>
      {isBlocked && (
        <p className="text-sm opacity-80">
          計測中か、保存していない学習があります。タイマーの画面で記録してからログインしてください。
        </p>
      )}
    </form>
  );
}

/** ブラウザの種類は、開いている間に変わらない。 */
function subscribeNever(): () => void {
  return () => {};
}
