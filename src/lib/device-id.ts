import { parseUuid } from "@/domain/study-log-input";

const STORAGE_KEY = "enestu_device_id";

/** localStorage が使えない環境で、ページを開いている間だけ使うID。 */
let memoryDeviceId: string | null = null;

/** 端末IDを返す。なければ生成して保存する。ブラウザでだけ呼び出すこと。 */
export function getDeviceId(): string {
  try {
    const stored = parseUuid(localStorage.getItem(STORAGE_KEY));
    if (stored.ok) return stored.value;
    const created = memoryDeviceId ?? crypto.randomUUID();
    memoryDeviceId = created;
    localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    memoryDeviceId ??= crypto.randomUUID();
    return memoryDeviceId;
  }
}
