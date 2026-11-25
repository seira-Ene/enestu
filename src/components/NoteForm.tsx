import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { MAX_NOTE_LENGTH, parseNoteInput } from "@/domain/note";
import { compressImage } from "@/lib/compress-image";
import { saveNote } from "@/lib/notes-api";
import {
  ALERT,
  HEADING,
  PANEL,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  TEXT_INPUT,
} from "./form-styles";

type Photo = { readonly blob: Blob; readonly previewUrl: string };
type Phase = "idle" | "compressing" | "sending";

type Props = {
  onSaved: () => Promise<void>;
};

/** 写真とメモを送る欄。失敗しても、書いた内容は残す。 */
export function NoteForm({ onSaved }: Props) {
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** 同じ内容の送り直しなら同じIDを使い、二重に送らない。 */
  const lastAttempt = useRef<{
    id: string;
    body: string;
    blob: Blob | null;
  } | null>(null);

  const previewUrl = photo?.previewUrl ?? null;
  useEffect(() => {
    if (previewUrl === null) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // 同じ写真を選び直しても、変更として届くようにする。
    event.target.value = "";
    if (file === undefined) return;
    setPhase("compressing");
    setError(null);
    setNotice(null);
    const result = await compressImage(file);
    setPhase("idle");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPhoto({
      blob: result.value,
      previewUrl: URL.createObjectURL(result.value),
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase !== "idle") return;
    const blob = photo?.blob ?? null;
    const last = lastAttempt.current;
    const id =
      last !== null && last.body === body && last.blob === blob
        ? last.id
        : crypto.randomUUID();
    const input = parseNoteInput(id, body, blob !== null);
    if (!input.ok) {
      setError(input.error);
      return;
    }
    lastAttempt.current = { id, body, blob };

    setPhase("sending");
    setError(null);
    setNotice(null);
    const result = await saveNote(id, input.value.body, blob);
    setPhase("idle");
    if (!result.ok) {
      setError(`${result.error}（書いた内容は残っています）`);
      return;
    }
    lastAttempt.current = null;
    setBody("");
    setPhoto(null);
    setNotice("送りました。");
    await onSaved();
  }

  const isBusy = phase !== "idle";

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className={PANEL}
      aria-labelledby="note-form-title"
    >
      <h2 id="note-form-title" className={HEADING}>
        写真とメモを送る
      </h2>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-accent">
          疑問やメモ（{MAX_NOTE_LENGTH}文字まで）
        </span>
        <textarea
          value={body}
          rows={3}
          onChange={(event) => {
            setBody(event.target.value);
            setNotice(null);
          }}
          placeholder="例：なぜここで符号が変わる？"
          className={TEXT_INPUT}
        />
      </label>

      {photo !== null && (
        <div className="flex flex-col items-center gap-2">
          <Image
            src={photo.previewUrl}
            alt="送る写真"
            width={320}
            height={240}
            unoptimized
            className="max-h-60 w-auto rounded-[min(var(--decor-radius),12px)] object-contain"
          />
          <button
            type="button"
            disabled={isBusy}
            onClick={() => setPhoto(null)}
            className="py-1 text-sm underline disabled:opacity-50"
          >
            写真をやめる
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <PhotoButton
          label="写真を撮る"
          isCamera
          isDisabled={isBusy}
          onChange={(event) => void handlePhoto(event)}
        />
        <PhotoButton
          label="写真を選ぶ"
          isCamera={false}
          isDisabled={isBusy}
          onChange={(event) => void handlePhoto(event)}
        />
      </div>

      {error !== null && (
        <p role="alert" className={ALERT}>
          {error}
        </p>
      )}
      {notice !== null && (
        <p role="status" className={ALERT}>
          {notice}
        </p>
      )}
      <button type="submit" disabled={isBusy} className={PRIMARY_BUTTON}>
        {phase === "compressing" && "写真を縮めています…"}
        {phase === "sending" && "送っています…"}
        {phase === "idle" && "送る"}
      </button>
    </form>
  );
}

/** 写真の選択欄を、ボタンの見た目で出す。 */
function PhotoButton({
  label,
  isCamera,
  isDisabled,
  onChange,
}: {
  label: string;
  isCamera: boolean;
  isDisabled: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label
      className={`${SECONDARY_BUTTON} text-sm has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary ${
        isDisabled ? "opacity-50" : "cursor-pointer"
      }`}
    >
      {label}
      <input
        type="file"
        accept="image/*"
        capture={isCamera ? "environment" : undefined}
        disabled={isDisabled}
        onChange={onChange}
        className="sr-only"
      />
    </label>
  );
}
