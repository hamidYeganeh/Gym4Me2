"use client";
import { useId, useState } from "react";
import { useTranslations } from "@repo/i18n";
import { Input } from "../Input";
import { IranianDateInput } from "./IranianDateInput";
export function IranianDateTimeInput({
  name,
  defaultValue = "",
  id,
  className,
  required,
  disabled,
  min,
  onValueChange,
  ...aria
}: {
  name?: string;
  defaultValue?: string;
  id?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  onValueChange?: (value: string) => void;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const t = useTranslations("Closure"),
    generated = useId(),
    inputId = id ?? generated;
  const [date, setDate] = useState(defaultValue.slice(0, 10)),
    [time, setTime] = useState(defaultValue.slice(11, 16));
  const combined = date && time ? `${date}T${time}:00+03:30` : "";
  return (
    <span className="grid gap-2" role="group">
      <IranianDateInput
        id={inputId}
        className={className}
        value={date}
        required={required}
        disabled={disabled}
        min={min?.slice(0, 10)}
        onValueChange={(v) => {
          setDate(v);
          onValueChange?.(v && time ? `${v}T${time}:00+03:30` : "");
        }}
      />
      <Input
        {...aria}
        aria-label={t("time")}
        className={className}
        type="time"
        value={time}
        required={required}
        disabled={disabled}
        onChange={(e) => {
          setTime(e.target.value);
          onValueChange?.(
            date && e.target.value ? `${date}T${e.target.value}:00+03:30` : "",
          );
        }}
      />
      {name && (
        <input type="hidden" name={name} value={combined} disabled={disabled} />
      )}
      <span className="text-xs text-muted-foreground">{t("tehranTime")}</span>
    </span>
  );
}
