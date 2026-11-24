import { AccountLink } from "./AccountLink";
import { CharacterPortrait } from "./characters";
import { useWorld } from "./WorldProvider";

type Props = {
  title: string;
  subtitle: string;
};

/** 全画面共通の見出し。右上から世界線、下の行からアカウントへ進める。 */
export function ScreenHeader({ title, subtitle }: Props) {
  const { theme, openPicker } = useWorld();
  return (
    <header className="panel flex flex-col gap-2 px-4 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl whitespace-nowrap text-primary min-[360px]:text-2xl">
            {title}
          </h1>
          <p className="text-xs text-accent">{subtitle}</p>
        </div>
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
      </div>
      <AccountLink />
    </header>
  );
}
