import Image from "next/image";
import { useState } from "react";
import type { Note } from "@/domain/note";
import { formatJstDateTime } from "@/domain/study-time";
import { deleteNote } from "@/lib/notes-api";
import type { Remote } from "@/lib/use-remote";
import { ALERT, HEADING, ITEM, PANEL } from "./form-styles";

type Props = {
  title: string;
  notes: Remote<Note[]>;
};

export function NoteList({ title, notes }: Props) {
  const { data, error, reload } = notes;
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (
      !window.confirm("このメモを写真ごと消しますか？\n元には戻せません。")
    ) {
      return;
    }
    setDeletingId(id);
    setMessage(null);
    const result = await deleteNote(id);
    if (!result.ok) setMessage(result.error);
    await reload();
    setDeletingId(null);
  }

  return (
    <section aria-label={title} className={PANEL}>
      <h2 className={HEADING}>{title}（新しい順）</h2>
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
      {message !== null && (
        <p role="alert" className={ALERT}>
          {message}
        </p>
      )}
      {data === null && error === null && <p>読み込んでいます…</p>}
      {data !== null && data.length === 0 && (
        <p className="opacity-80">まだありません。スマホから送ってみましょう。</p>
      )}
      {data !== null && data.length > 0 && (
        <ul aria-live="polite" className="flex flex-col gap-3">
          {data.map((note) => (
            <li
              key={note.id}
              className={`${ITEM} flex flex-col gap-2 motion-safe:animate-appear`}
            >
              <NotePhoto note={note} />
              {note.body !== "" && (
                <p className="break-words whitespace-pre-wrap">{note.body}</p>
              )}
              <div className="flex items-center justify-between gap-3 text-sm">
                <time dateTime={note.createdAt} className="opacity-80">
                  {formatJstDateTime(note.createdAt)}
                </time>
                <button
                  type="button"
                  disabled={deletingId !== null}
                  onClick={() => void handleDelete(note.id)}
                  className="py-1 underline disabled:opacity-50"
                >
                  {deletingId === note.id ? "消しています…" : "消す"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function NotePhoto({ note }: { note: Note }) {
  if (!note.hasImage) return null;
  if (note.imageUrl === null) {
    return <p className="text-sm opacity-80">写真を表示できません。</p>;
  }
  return (
    <a href={note.imageUrl} target="_blank" rel="noreferrer">
      <span className="relative block aspect-[4/3] overflow-hidden rounded-[min(var(--decor-radius),12px)] bg-surface">
        <Image
          src={note.imageUrl}
          alt="メモの写真（押すと大きく開く）"
          fill
          // 期限つきのURLなので、最適化の仕組みを通さない。
          unoptimized
          className="object-contain"
        />
      </span>
    </a>
  );
}
