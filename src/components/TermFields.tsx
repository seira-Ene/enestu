import { MAX_KEYWORDS } from "@/domain/explanation-input";
import { TEXT_INPUT } from "./form-styles";

/** 入力中の用語。観点は1行に1つ書く。 */
export type TermText = {
  readonly subject: string;
  readonly term: string;
  readonly keywords: string;
};

type Props = {
  text: TermText;
  subjects: readonly string[];
  isSaving: boolean;
  onChange: (text: TermText) => void;
};

/** 用語の入力欄。登録と変更で共通に使う。 */
export function TermFields({ text, subjects, isSaving, onChange }: Props) {
  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-accent">科目名</span>
        <input
          type="text"
          list="term-subjects"
          value={text.subject}
          onChange={(e) => onChange({ ...text, subject: e.target.value })}
          readOnly={isSaving}
          autoComplete="off"
          className={TEXT_INPUT}
        />
        <datalist id="term-subjects">
          {subjects.map((subject) => (
            <option key={subject} value={subject} />
          ))}
        </datalist>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-accent">用語</span>
        <input
          type="text"
          value={text.term}
          onChange={(e) => onChange({ ...text, term: e.target.value })}
          readOnly={isSaving}
          placeholder="例：固有値"
          autoComplete="off"
          className={TEXT_INPUT}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-accent">
          説明に入れたい観点（1行に1つ、{MAX_KEYWORDS}個まで）
        </span>
        <textarea
          value={text.keywords}
          onChange={(e) => onChange({ ...text, keywords: e.target.value })}
          readOnly={isSaving}
          rows={4}
          placeholder={"例：\n向きが変わらない\n線形変換/一次変換"}
          className={TEXT_INPUT}
        />
        <span className="text-xs opacity-80">
          「/」で区切ると、どれか1つが入っていればよい言い換えになります。
        </span>
      </label>
    </>
  );
}
