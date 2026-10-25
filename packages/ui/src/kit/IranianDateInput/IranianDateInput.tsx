"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "@repo/i18n";
import { Input } from "../Input";
import { displayLocalDate, parseLocalDate } from "../../lib/iranian-date";

export function IranianDateInput({
  name,
  value,
  defaultValue = "",
  onValueChange,
  required,
  disabled,
  min,
  max,
  className,
  id,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (iso: string) => void;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  className?: string;
  id?: string;
}) {
  const locale = useLocale(),
    t = useTranslations("Closure"),
    hint = useId(),
    ref = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(() =>
    displayLocalDate(value ?? defaultValue, locale),
  );
  const [previous, setPrevious] = useState(value);
  if (value !== undefined && value !== previous) {
    setPrevious(value);
    if (parseLocalDate(draft, locale) !== value)
      setDraft(displayLocalDate(value, locale));
  }
  const iso = parseLocalDate(draft, locale),
    invalid = Boolean(
      draft && (!iso || (min && iso < min) || (max && iso > max)),
    );
  useEffect(() => {
    ref.current?.setCustomValidity(invalid ? t("invalidDate") : "");
  }, [invalid, t]);
  return (
    <span className="grid gap-1">
      <Input
        ref={ref}
        id={id}
        className={className}
        type="text"
        dir="ltr"
        inputMode="numeric"
        maxLength={10}
        value={draft}
        required={required}
        disabled={disabled}
        aria-describedby={hint}
        aria-invalid={invalid || undefined}
        placeholder={locale === "fa" ? "۱۴۰۵/۰۸/۰۳" : "2026-10-25"}
        onChange={(e) => {
          setDraft(e.target.value);
          onValueChange?.(parseLocalDate(e.target.value, locale));
        }}
      />
      {name && (
        <input type="hidden" name={name} value={iso} disabled={disabled} />
      )}
      <span id={hint} className="text-xs text-muted-foreground">
        {t(locale === "fa" ? "jalaliHint" : "gregorianHint")}
      </span>
    </span>
  );
}
