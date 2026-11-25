import { useState } from "react";
import {
  accountLabel,
  describeCounts,
  hasRecords,
  type AccountState,
  type RecordCounts,
} from "@/domain/account";
import type { MovedCounts } from "@/lib/account-api";
import { useActiveSession } from "@/lib/active-session";
import { useAccount } from "./AccountProvider";
import { ClaimDialog } from "./ClaimDialog";
import {
  ALERT,
  HEADING,
  PANEL,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
} from "./form-styles";
import { LoginForm } from "./LoginForm";
import { useSettings } from "./SettingsProvider";

type SignedIn = Extract<AccountState, { kind: "signed_in" }>;

type Props = {
  /** ログインから戻った直後か。 */
  justSignedIn: boolean;
};

/** ログインの状態に応じた操作。 */
export function AccountPanel({ justSignedIn }: Props) {
  const { data, error, reload } = useAccount();
  const isTimerActive = useActiveSession() !== null;

  return (
    <section aria-labelledby="account-title" className={PANEL}>
      <h2 id="account-title" className={HEADING}>
        ログイン
      </h2>
      {error !== null && (
        <div role="alert" className="flex flex-col items-start gap-2">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="underline"
          >
            もう一度読み込む
          </button>
        </div>
      )}
      {data === null && error === null && <p>確認しています…</p>}
      {data?.kind === "guest" && (
        <>
          <p>
            ログインすると、別の端末でも同じ記録を使えます。しなくても、これまでどおり使えます。
          </p>
          <LoginForm isBlocked={isTimerActive} />
        </>
      )}
      {data?.kind === "expired" && (
        <>
          <p role="alert" className={ALERT}>
            ログインが切れました。記録を守るため、ログインし直すまで保存しません。計測中の時間は、この端末に残っています。
          </p>
          <LoginForm isBlocked={false} />
          <LogoutForm
            label="ログアウトして、この端末だけで使う"
            isBlocked={isTimerActive}
            blockedReason="保存していない学習があります。ログインし直して保存するか、タイマーの画面で「記録せずにやめる」を選んでください。"
          />
        </>
      )}
      {data?.kind === "changed" && (
        <>
          <p role="alert" className={ALERT}>
            ほかのタブなどで、ログインの状態が変わりました。
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={PRIMARY_BUTTON}
          >
            画面を読み込み直す
          </button>
        </>
      )}
      {data?.kind === "signed_in" && (
        <SignedInBody
          state={data}
          justSignedIn={justSignedIn}
          isTimerActive={isTimerActive}
          onReload={reload}
        />
      )}
    </section>
  );
}

function SignedInBody({
  state: { account, claimable },
  justSignedIn,
  isTimerActive,
  onReload,
}: {
  state: SignedIn;
  justSignedIn: boolean;
  isTimerActive: boolean;
  onReload: () => Promise<void>;
}) {
  /** null は、まだ開くとも閉じるとも選んでいない状態。 */
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [moved, setMoved] = useState<RecordCounts | null>(null);
  const { reload: reloadSettings } = useSettings();
  const counts = claimable !== null && hasRecords(claimable) ? claimable : null;

  async function handleClaimed(result: MovedCounts) {
    setMoved({ ...result, heroName: counts?.heroName ?? null });
    setIsOpen(false);
    // 名前も移っているので、呼び方を直す。
    await Promise.all([onReload(), reloadSettings()]);
  }

  return (
    <>
      <div className="min-w-0">
        <p className="font-bold break-words">{accountLabel(account)}</p>
        {account.name !== null && account.email !== null && (
          <p className="text-sm break-all opacity-80">{account.email}</p>
        )}
      </div>
      {moved !== null && (
        <p role="status" className={ALERT}>
          引き継ぎました：{describeCounts(moved)}
        </p>
      )}
      {counts !== null && (
        <>
          <p>
            この端末に、引き継いでいない記録があります：
            {describeCounts(counts)}
          </p>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className={PRIMARY_BUTTON}
          >
            引き継ぎを確認する
          </button>
          <ClaimDialog
            isOpen={isOpen ?? justSignedIn}
            account={account}
            counts={counts}
            onClose={() => setIsOpen(false)}
            onClaimed={(result) => void handleClaimed(result)}
          />
        </>
      )}
      <LogoutForm
        label="ログアウト"
        isBlocked={isTimerActive}
        blockedReason="計測中か、保存していない学習があります。タイマーの画面で記録してからログアウトしてください。"
      />
    </>
  );
}

function LogoutForm({
  label,
  isBlocked,
  blockedReason,
}: {
  label: string;
  isBlocked: boolean;
  blockedReason: string;
}) {
  return (
    <form method="post" action="/auth/logout" className="flex flex-col gap-2">
      <button type="submit" disabled={isBlocked} className={SECONDARY_BUTTON}>
        {label}
      </button>
      <p className="text-sm opacity-80">
        {isBlocked
          ? blockedReason
          : "ログアウトすると記録は見えなくなり、もう一度ログインすると戻ります。"}
      </p>
    </form>
  );
}
