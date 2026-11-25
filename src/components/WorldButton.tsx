import { CharacterPortrait } from "./characters";
import { useWorld } from "./WorldProvider";

/** 今の世界線と、世界線を選ぶ画面を開くボタン。 */
export function WorldButton() {
  const { theme, openPicker } = useWorld();
  return (
    <button
      type="button"
      onClick={openPicker}
      aria-haspopup="dialog"
      className="flex shrink-0 items-center gap-2 rounded-full border border-accent bg-background py-1 pr-3 pl-1 text-left"
    >
      <span className="size-9">
        <CharacterPortrait theme={theme} mood="normal" />
      </span>
      <span className="flex flex-col text-xs">
        <span className="font-bold">{theme.displayName}</span>
        <span className="text-accent">世界線を変える</span>
      </span>
    </button>
  );
}
