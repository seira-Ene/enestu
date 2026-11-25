import { AccountLink } from "./AccountLink";
import { WorldButton } from "./WorldButton";

type Props = {
  title: string;
  subtitle: string;
};

/**
 * 全画面共通の見出し。右上から世界線、下の行からアカウントへ進める。
 * PC版では、どちらも左メニューにあるため出さない。
 */
export function ScreenHeader({ title, subtitle }: Props) {
  return (
    <header className="panel flex flex-col gap-2 px-4 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl whitespace-nowrap text-primary min-[360px]:text-2xl">
            {title}
          </h1>
          <p className="text-xs text-accent">{subtitle}</p>
        </div>
        <div className="contents lg:hidden">
          <WorldButton />
        </div>
      </div>
      <div className="contents lg:hidden">
        <AccountLink />
      </div>
    </header>
  );
}
