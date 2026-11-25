import { useState, type FormEvent } from "react";
import { MAX_HERO_NAME_LENGTH, parseHeroName } from "@/domain/hero-name";
import { saveHeroName } from "@/lib/settings-api";
import {
  ALERT,
  HEADING,
  PANEL,
  PRIMARY_BUTTON,
  TEXT_INPUT,
} from "./form-styles";
import { useSettings } from "./SettingsProvider";
import { useWorld } from "./WorldProvider";

/** 主人公の名前を決める欄。未ログインでも使える。 */
export function HeroNamePanel() {
  const { theme } = useWorld();
  const { data, reload } = useSettings();
  /** 入力中の文字。触るまでは、保存してある名前を出す。 */
  const [typed, setTyped] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const saved = data?.heroName ?? null;

  async function save(value: string) {
    const name = parseHeroName(value);
    if (!name.ok) {
      setError(name.error);
      setNotice(null);
      return;
    }
    setIsSaving(true);
    setError(null);
    setNotice(null);
    const result = await saveHeroName(name.value ?? "");
    if (result.ok) {
      await reload();
      setTyped(null);
      setNotice(
        name.value === null
          ? "名前を消しました。"
          : `${theme.character.name}が「${name.value}」と呼びます。`,
      );
    } else {
      setError(result.error);
    }
    setIsSaving(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSaving) void save(typed ?? saved ?? "");
  }

  return (
    <section aria-labelledby="hero-title" id="hero" className={PANEL}>
      <h2 id="hero-title" className={HEADING}>
        主人公
      </h2>
      <p>名前を決めると、キャラクターがあなたを名前で呼びます。</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-accent">
            名前（{MAX_HERO_NAME_LENGTH}文字まで。本名でなくて大丈夫）
          </span>
          <input
            type="text"
            value={typed ?? saved ?? ""}
            onChange={(event) => {
              setTyped(event.target.value);
              setNotice(null);
            }}
            readOnly={isSaving || data === null}
            placeholder="例：そら"
            autoComplete="off"
            className={TEXT_INPUT}
          />
        </label>
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
        <button
          type="submit"
          disabled={isSaving || data === null}
          className={PRIMARY_BUTTON}
        >
          {isSaving ? "保存しています…" : "この名前にする"}
        </button>
        {saved !== null && (
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void save("")}
            className="py-2 text-sm underline disabled:opacity-50"
          >
            名前を消す
          </button>
        )}
      </form>
    </section>
  );
}
