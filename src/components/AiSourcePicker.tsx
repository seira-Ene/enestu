import Link from "next/link";
import { useState, type ChangeEvent } from "react";
import { MAX_AI_IMAGES, type AiImage } from "@/domain/ai-cards";
import { fetchAiKey } from "@/lib/ai-key-api";
import { compressImage } from "@/lib/compress-image";
import { useRemote } from "@/lib/use-remote";
import { useAccount } from "./AccountProvider";
import { ALERT } from "./form-styles";

/** AIに送る写真。縮めてJPEGにし、メモリにだけ置く。 */
export type AiPhoto = {
  readonly id: string;
  readonly name: string;
  readonly image: AiImage;
};

type Props = {
  photos: readonly AiPhoto[];
  onChange: (photos: readonly AiPhoto[]) => void;
};

/** AIで作るときの、使えるかどうかの案内と、写真の選択。 */
export function AiSourcePicker({ photos, onChange }: Props) {
  const { data: account } = useAccount();
  const [error, setError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);

  if (account?.kind !== "signed_in") {
    return (
      <p className={`${ALERT} text-sm`}>
        AIで作るには、ログインして、
        <Link href="/account" className="underline">
          アカウントの画面
        </Link>
        で自分の Gemini のキーを登録してください。
      </p>
    );
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const files = [...(input.files ?? [])];
    // 同じ写真を選び直せるようにする。
    input.value = "";
    if (files.length === 0) return;
    if (photos.length + files.length > MAX_AI_IMAGES) {
      setError(`写真は${MAX_AI_IMAGES}枚までです。`);
      return;
    }
    setIsReading(true);
    setError(null);
    const added: AiPhoto[] = [];
    for (const file of files) {
      const compressed = await compressImage(file);
      if (!compressed.ok) {
        setError(compressed.error);
        break;
      }
      added.push({
        id: crypto.randomUUID(),
        name: file.name,
        image: { mimeType: "image/jpeg", data: await toBase64(compressed.value) },
      });
    }
    setIsReading(false);
    onChange([...photos, ...added]);
  }

  return (
    <div className="flex flex-col gap-3">
      <KeyStatus />
      <label className="flex flex-col gap-1">
        <span className="text-sm text-accent">
          写真を選ぶ（ノートやプリント。{MAX_AI_IMAGES}枚まで）
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={isReading || photos.length >= MAX_AI_IMAGES}
          onChange={(event) => void handleFiles(event)}
          className="text-sm file:mr-3 file:rounded-[var(--decor-button-radius)] file:border-2 file:border-accent file:bg-background file:px-3 file:py-2 file:text-text"
        />
      </label>
      {photos.length > 0 && (
        <ul aria-label="AIに送る写真" className="flex flex-col gap-1 text-sm">
          {photos.map((photo) => (
            <li key={photo.id} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate">{photo.name}</span>
              <button
                type="button"
                onClick={() => onChange(photos.filter((other) => other.id !== photo.id))}
                className="shrink-0 underline"
              >
                外す
              </button>
            </li>
          ))}
        </ul>
      )}
      {error !== null && (
        <p role="alert" className="text-sm font-bold text-primary">
          {error}
        </p>
      )}
      <p className="text-xs opacity-80">
        文章と写真を Google の Gemini に送って、問題の候補を作ります。写真は送る前に縮め、どこにも保存しません。個人情報や、送ってよいか分からない資料は送らないでください。
      </p>
    </div>
  );
}

/** キーを登録しているか。登録していなければ、登録の画面へ案内する。 */
function KeyStatus() {
  const { data, error } = useRemote(fetchAiKey);
  if (error !== null) return <p className="text-sm">{error}</p>;
  if (data === null) return <p className="text-sm">キーを確かめています…</p>;
  if (data.saved === null) {
    return (
      <p className={`${ALERT} text-sm`}>
        AIのキーがまだありません。
        <Link href="/account" className="underline">
          アカウントの画面
        </Link>
        で、自分の Gemini のキーを登録してください。
      </p>
    );
  }
  return (
    <p className="text-sm">
      登録済みのキー（…{data.saved.last4}）で、Gemini が作ります。
    </p>
  );
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("写真を読めません"));
    reader.readAsDataURL(blob);
  });
}
