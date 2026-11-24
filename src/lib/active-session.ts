import { useSyncExternalStore } from "react";
import { parseSubject, parseUuid } from "@/domain/validation";

/**
 * 計測中、または保存待ちの学習。再読み込みしても失われないよう
 * localStorage に置き、保存に成功するまで消さない。
 */
export type ActiveSession = {
  readonly id: string;
  readonly subject: string;
  readonly startedAt: string;
  /** null なら計測中、値があれば保存待ち。 */
  readonly endedAt: string | null;
};

const STORAGE_KEY = "enestu_active_session";
const listeners = new Set<() => void>();

/** localStorage が使えない環境で代わりに使う値。 */
let memoryRaw: string | null = null;
let cachedRaw: string | null = null;
let cachedSession: ActiveSession | null = null;

export function useActiveSession(): ActiveSession | null {
  return useSyncExternalStore(subscribe, getActiveSession, () => null);
}

export function getActiveSession(): ActiveSession | null {
  const raw = readRaw();
  // 同じ内容なら同じオブジェクトを返し、無駄な再描画を防ぐ。
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSession = parseSession(raw);
  }
  return cachedSession;
}

export function setActiveSession(session: ActiveSession | null): void {
  memoryRaw = session === null ? null : JSON.stringify(session);
  try {
    if (memoryRaw === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, memoryRaw);
  } catch {
    // 保存できない環境では memoryRaw だけで動かす。
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return memoryRaw;
  }
}

/** 壊れた値や古い形式の値は、計測なしとして扱う。 */
function parseSession(raw: string | null): ActiveSession | null {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;

  const fields: Partial<Record<keyof ActiveSession, unknown>> = value;
  const id = parseUuid(fields.id);
  const subject = parseSubject(fields.subject);
  const { startedAt, endedAt } = fields;
  if (!id.ok || !subject.ok || !isTime(startedAt)) return null;
  if (endedAt !== null && !isTime(endedAt)) return null;
  return { id: id.value, subject: subject.value, startedAt, endedAt };
}

function isTime(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}
