"use client";
import { useTranslations } from "@repo/i18n";
import { useState, type CSSProperties } from "react";
import {
  ArrowRightIcon as ArrowRight,
  ArrowRotateClockwise1Icon as LoaderCircle,
} from "./icons";
/** A deliberate swipe and an equivalent keyboard/touch button invoke the same command. */
export function ConfirmAction({
  label,
  disabled,
  onConfirm,
}: {
  label: string;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const t = useTranslations("LumaDesign");
  const [progress, setProgress] = useState(0);
  return (
    <div className="confirm-action">
      <div
        className="confirm-slide"
        style={{ "--confirm-progress": progress / 100 } as CSSProperties}
      >
        <span aria-hidden="true" className="confirm-slide-copy">
          {label}
        </span>
        <span aria-hidden="true" className="confirm-slide-thumb">
          {disabled ? (
            <LoaderCircle size={19} />
          ) : (
            <ArrowRight size={19} className="rtl:rotate-180" />
          )}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={progress}
          disabled={disabled}
          aria-label={t("slideConfirm", { action: label })}
          onChange={(event) => {
            const next = Number(event.target.value);
            setProgress(next);
            if (next === 100 && !disabled) {
              onConfirm();
              setProgress(0);
            }
          }}
          onPointerUp={() => setProgress(0)}
          onPointerCancel={() => setProgress(0)}
          onBlur={() => setProgress(0)}
        />
      </div>
      <button
        type="button"
        className="confirm-alternative"
        disabled={disabled}
        onClick={onConfirm}
      >
        {label}
      </button>
    </div>
  );
}
