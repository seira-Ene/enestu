import { useEffect, useRef } from "react";
import { themes } from "@/themes";
import { WORLD_IDS, type WorldId } from "@/themes/types";
import { CharacterPortrait } from "./characters";

type Props = {
  isOpen: boolean;
  current: WorldId;
  onSelect: (worldId: WorldId) => void;
  onClose: () => void;
};

/** 5つの世界線から選ぶ画面。見本はそれぞれの配色で表示する。 */
export function WorldPicker({ isOpen, current, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="world-picker-title"
      // Escキーで閉じたとき。
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="panel m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto p-4 text-text backdrop:bg-background/80"
    >
      <div className="flex flex-col gap-4">
        <div>
          <h2
            id="world-picker-title"
            className="font-display text-xl text-primary"
          >
            今日はどの世界線で学ぶ？
          </h2>
          <p className="text-sm">
            学習の記録はそのまま。いつでも右上のボタンから変えられます。
          </p>
        </div>
        <ul className="flex flex-col gap-3">
          {WORLD_IDS.map((id) => {
            const theme = themes[id];
            const isCurrent = id === current;
            return (
              <li key={id} data-world={id}>
                <button
                  type="button"
                  aria-pressed={isCurrent}
                  onClick={() => onSelect(id)}
                  className={`panel flex w-full items-center gap-3 p-3 text-left text-text ${
                    isCurrent ? "outline-3 outline-offset-2 outline-primary" : ""
                  }`}
                >
                  <span className="size-16 shrink-0">
                    <CharacterPortrait theme={theme} mood="normal" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="font-bold text-primary">
                      {theme.displayName}
                      {isCurrent && "（選択中）"}
                    </span>
                    <span className="text-sm">{theme.tagline}</span>
                    <span className="text-xs text-accent">
                      {theme.character.name}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="py-2 text-sm underline"
        >
          このまま続ける
        </button>
      </div>
    </dialog>
  );
}
