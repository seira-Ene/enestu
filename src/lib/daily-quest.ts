import { parseSubject } from "@/domain/validation";
import type { SavedQuest } from "@/domain/weakness";

/** その日に選んだクエストを、この端末に覚えておく。 */

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

  const { date, kind, subject }: Partial<Record<keyof SavedQuest, unknown>> =
    value;
  const parsed = parseSubject(subject);
  if (typeof date !== "string" || !parsed.ok) return null;
  if (kind !== "weak" && kind !== "neglected") return null;
  return { date, kind, subject: parsed.value };
}

export function saveQuest(quest: SavedQuest): void {
  memoryRaw = JSON.stringify(quest);
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
