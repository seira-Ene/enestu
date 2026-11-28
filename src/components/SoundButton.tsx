import { useEffect, useRef, useState } from "react";
import {
  VOLUME_LABELS,
  VOLUME_LEVELS,
  type ChannelSetting,
} from "@/domain/sound";
import { SECONDARY_BUTTON } from "./form-styles";
import { PREVIEW_SECONDS, useSound } from "./SoundProvider";

/** 音の設定を開くボタン。 */
export function SoundButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { settings } = useSound();
  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        className="shrink-0 rounded-full border border-accent bg-background px-3 py-1 text-xs"
      >
        <span aria-hidden="true">{settings.se.isOn ? "♪" : "×"} </span>音
      </button>
      <SoundSettingsDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

function SoundSettingsDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { settings, change, isPreviewing, togglePreview } = useSound();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="sound-settings-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="panel m-auto w-[calc(100%-2rem)] max-w-sm p-5 text-text backdrop:bg-background/80"
    >
      {isOpen && (
        <div className="flex flex-col gap-4">
          <h2 id="sound-settings-title" className="font-display text-xl text-primary">
            音の設定
          </h2>
          <ChannelRow
            label="効果音"
            setting={settings.se}
            onChange={(setting) => change("se", setting)}
          />
          <ChannelRow
            label="BGM"
            setting={settings.bgm}
            onChange={(setting) => change("bgm", setting)}
          />
          {!settings.bgm.isOn && (
            <button
              type="button"
              aria-pressed={isPreviewing}
              onClick={togglePreview}
              className={SECONDARY_BUTTON}
            >
              {isPreviewing ? "試しに聞くのをやめる" : `BGMを試しに聞く（${PREVIEW_SECONDS}秒）`}
            </button>
          )}
          <p className="text-xs opacity-80">
            設定は、この端末に保存されます。BGMは、世界線ごとに曲が変わります。
          </p>
          <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
            閉じる
          </button>
        </div>
      )}
    </dialog>
  );
}

function ChannelRow({
  label,
  setting,
  onChange,
}: {
  label: string;
  setting: ChannelSetting;
  onChange: (setting: ChannelSetting) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-bold">{label}</span>
        <button
          type="button"
          aria-pressed={setting.isOn}
          aria-label={label}
          onClick={() => onChange({ ...setting, isOn: !setting.isOn })}
          className={`rounded-full px-4 py-1 text-sm font-bold ${
            setting.isOn ? "bg-primary text-background" : "border border-accent"
          }`}
        >
          {setting.isOn ? "ON" : "OFF"}
        </button>
      </div>
      <div role="group" aria-label={`${label}の音量`} className="grid grid-cols-3 gap-2">
        {VOLUME_LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            aria-pressed={setting.level === level}
            disabled={!setting.isOn}
            onClick={() => onChange({ ...setting, level })}
            className={`rounded-[var(--decor-button-radius)] py-2 text-sm disabled:opacity-40 ${
              setting.level === level ? "bg-primary text-background" : "border border-accent"
            }`}
          >
            {VOLUME_LABELS[level]}
          </button>
        ))}
      </div>
    </div>
  );
}
