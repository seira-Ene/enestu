import { useEffect, useRef, useState } from "react";
import {
  accountLabel,
  describeCounts,
  type Account,
  type RecordCounts,
} from "@/domain/account";
import { claimRecords, type MovedCounts } from "@/lib/account-api";
import { ALERT, PRIMARY_BUTTON } from "./form-styles";

type Props = {
  isOpen: boolean;
  account: Account;
  counts: RecordCounts;
  onClose: () => void;
  onClaimed: (moved: MovedCounts) => void;
};

/** 端末の記録をアカウントへ移す前の確認。元に戻せないため、自動では移さない。 */
export function ClaimDialog({
  isOpen,
  account,
  counts,
  onClose,
  onClaimed,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  function handleClose() {
    if (isMoving) return;
    setError(null);
    onClose();
  }

  async function handleClaim() {
    setIsMoving(true);
    setError(null);
    const result = await claimRecords();
    setIsMoving(false);
    if (result.ok) onClaimed(result.value);
    else setError(result.error);
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="claim-title"
      // Escキーで閉じたとき。
      onCancel={(event) => {
        event.preventDefault();
        handleClose();
      }}
      className="panel m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto p-5 text-text backdrop:bg-background/80"
    >
      <div className="flex flex-col gap-4">
        <h2 id="claim-title" className="font-display text-xl text-primary">
          この端末の記録を引き継ぎますか？
        </h2>
        <p className="text-lg font-bold">{describeCounts(counts)}</p>
        <p className="text-sm break-words">
          「{accountLabel(account)}」のアカウントに移します。
          {account.name !== null && account.email !== null && (
            <span className="block break-all opacity-80">{account.email}</span>
          )}
        </p>
        <ul className="list-disc pl-5 text-sm">
          <li>
            <strong>元には戻せません。</strong>
            移した記録は、ログインしている間だけ見えます。
          </li>
          <li>
            ほかの人と使っている端末なら、自分の記録か確かめてください。
          </li>
        </ul>
        {error !== null && (
          <p role="alert" className={ALERT}>
            {error}
          </p>
        )}
        <button
          type="button"
          disabled={isMoving}
          onClick={() => void handleClaim()}
          className={PRIMARY_BUTTON}
        >
          {isMoving ? "引き継いでいます…" : "引き継ぐ"}
        </button>
        <button
          type="button"
          disabled={isMoving}
          onClick={handleClose}
          className="py-2 text-sm underline disabled:opacity-50"
        >
          あとで決める
        </button>
      </div>
    </dialog>
  );
}
