import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiResult } from "./api-client";

export type Remote<T> = {
  /** まだ取得できていなければ null。 */
  readonly data: T | null;
  readonly error: string | null;
  readonly reload: () => Promise<void>;
};

/**
 * 画面を開いたときにデータを取得する。
 * fetcher は毎回同じ関数を渡すこと（変わるたびに取得し直すため）。
 */
export function useRemote<T>(fetcher: () => Promise<ApiResult<T>>): Remote<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latestLoad = useRef(0);

  const apply = useCallback((loadId: number, result: ApiResult<T>) => {
    // 後から始めた読み込みがあれば、遅れて届いた古い結果は捨てる。
    if (loadId !== latestLoad.current) return;
    if (result.ok) {
      setData(result.value);
      setError(null);
    } else {
      setError(result.error);
    }
  }, []);

  const reload = useCallback(async () => {
    const loadId = ++latestLoad.current;
    apply(loadId, await fetcher());
  }, [apply, fetcher]);

  useEffect(() => {
    const loadId = ++latestLoad.current;
    void fetcher().then((result) => apply(loadId, result));
  }, [apply, fetcher]);

  return { data, error, reload };
}
