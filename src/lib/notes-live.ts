import {
  needsNewToken,
  retryDelayMs,
  type LiveStatus,
} from "@/domain/live-connection";
import { fetchRealtimeToken } from "./notes-api";

/** つながったと言えるまで待つ時間。 */
const CONNECT_TIMEOUT_MS = 15_000;

type Handlers = {
  readonly onStatus: (status: LiveStatus) => void;
  /** 取り直しが要るとき。合図を受けたときと、取りこぼしがありうるとき。 */
  readonly onChange: () => void;
};

/**
 * メモの合図を受け取り始める。切れたら、自分でつなぎ直す。
 * 返す関数を呼ぶと終わる。
 */
export function connectNotes(userId: string, handlers: Handlers): () => void {
  let isStopped = false;
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closeCurrent = () => {};
  /** 古い接続から遅れて届いた知らせを無視するための番号。 */
  let generation = 0;

  function open() {
    closeCurrent();
    clearTimeout(timer);
    const id = ++generation;
    const isCurrent = () => !isStopped && id === generation;
    timer = setTimeout(() => handleTrouble(id), CONNECT_TIMEOUT_MS);
    const closing = subscribe(userId, {
      onLive: () => {
        if (!isCurrent()) return;
        clearTimeout(timer);
        failures = 0;
        handlers.onStatus("live");
        // つながる前の変更は、合図が届いていない。
        handlers.onChange();
      },
      onSignal: () => {
        if (isCurrent()) handlers.onChange();
      },
      onTrouble: () => handleTrouble(id),
    });
    closeCurrent = () => void closing.then((close) => close());
  }

  function handleTrouble(id: number) {
    if (isStopped || id !== generation) return;
    closeConnection();
    if (!navigator.onLine) {
      handlers.onStatus("offline");
      return;
    }
    failures += 1;
    handlers.onStatus("reconnecting");
    timer = setTimeout(open, retryDelayMs(failures));
  }

  function closeConnection() {
    generation += 1;
    clearTimeout(timer);
    closeCurrent();
    closeCurrent = () => {};
  }

  function handleOnline() {
    failures = 0;
    handlers.onStatus("reconnecting");
    open();
  }

  function handleOffline() {
    closeConnection();
    handlers.onStatus("offline");
  }

  function handleVisible() {
    // 隠れている間は、合図を取りこぼすことがある。
    if (document.visibilityState === "visible") handlers.onChange();
  }

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  document.addEventListener("visibilitychange", handleVisible);
  if (navigator.onLine) {
    handlers.onStatus("connecting");
    open();
  } else {
    handlers.onStatus("offline");
  }

  return () => {
    isStopped = true;
    closeConnection();
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    document.removeEventListener("visibilitychange", handleVisible);
  };
}

type Listeners = {
  readonly onLive: () => void;
  readonly onSignal: () => void;
  readonly onTrouble: () => void;
};

/** 1回分の接続。終えるための関数を返す。 */
async function subscribe(
  userId: string,
  { onLive, onSignal, onTrouble }: Listeners,
): Promise<() => void> {
  try {
    // ほかの画面を重くしないよう、使うときだけ読み込む。
    const { createRealtimeClient } = await import("./supabase/realtime");
    const client = createRealtimeClient(createTokenSource());
    // 鍵を受け取る前に入ろうとすると、拒否される。
    await client.realtime.setAuth();
    client
      .channel(`notes:${userId}`, { config: { private: true } })
      .on("broadcast", { event: "notes_changed" }, onSignal)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") onLive();
        else onTrouble();
      });
    return () => void client.removeAllChannels();
  } catch {
    onTrouble();
    return () => {};
  }
}

/** 鍵をメモリにだけ置き、期限が近づいたら取り直す。 */
function createTokenSource(): () => Promise<string | null> {
  let token: string | null = null;
  return async () => {
    if (needsNewToken(token, new Date())) {
      const result = await fetchRealtimeToken();
      if (result.ok) token = result.value;
    }
    return token;
  };
}
