import { parseSubject } from "@/domain/validation";
import type { SavedQuest } from "@/domain/weakness";
import { getPageAccountId } from "./account-marker";

/** その日に選んだクエストを、この端末に覚えておく。 */

/** 端末を共有していても、ほかの人のクエストを出さないために覚える持ち主。 */
type StoredQuest = SavedQuest & { readonly accountId: string | null };

const STORAGE_KEY = "enestu_daily_quest";

/** localStorage が使えない環境で、ページを開いている間だけ使う値。 */
let memoryRaw: string | null = null;

export function loadSavedQuest(): SavedQuest | null {
  const raw = readRaw();
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;

  const {
    date,
    kind,
    subject,
    accountId = null,
  }: Partial<Record<keyof StoredQuest, unknown>> = value;
  if (accountId !== getPageAccountId()) return null;
  const parsed = parseSubject(subject);
  if (typeof date !== "string" || !parsed.ok) return null;
  if (kind !== "weak" && kind !== "neglected") return null;
  return { date, kind, subject: parsed.value };
}

export function saveQuest(quest: SavedQuest): void {
  const stored: StoredQuest = { ...quest, accountId: getPageAccountId() };
  memoryRaw = JSON.stringify(stored);
  try {
    localStorage.setItem(STORAGE_KEY, memoryRaw);
  } catch {
    // 保存できない環境では memoryRaw だけで動かす。
  }
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return memoryRaw;
  }
}
