import type { LiveStatus } from "@/domain/live-connection";

const LABELS: Readonly<Record<LiveStatus, string>> = {
  connecting: "つないでいます…",
  live: "同期中",
  reconnecting: "切れました。つなぎ直しています…",
  offline: "オフラインです。つながると自動で同期します",
};

/** 即時同期の状態。色だけに頼らず、文字でも伝える。 */
export function ConnectionStatus({ status }: { status: LiveStatus }) {
  const isLive = status === "live";
  return (
    <p role="status" className="flex items-center gap-2 text-sm">
      <span
        aria-hidden="true"
        className={`size-2.5 shrink-0 rounded-full border-2 border-accent ${
          isLive ? "bg-accent" : "motion-safe:animate-pulse"
        }`}
      />
      {LABELS[status]}
    </p>
  );
}
