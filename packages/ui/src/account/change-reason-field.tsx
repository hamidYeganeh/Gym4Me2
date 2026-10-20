"use client";
import { useId } from "react";
import { useTranslations } from "@repo/i18n";
import { Field, FieldLabel, FieldDescription, FieldError } from "../kit/Field";
import { Textarea } from "../kit/Textarea";
import type { ChangeReasonError } from "./change-reason";

export function ChangeReasonField({
  value,
  onChange,
  error,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: ChangeReasonError;
  disabled?: boolean;
}) {
  const id = useId();
  const t = useTranslations();
  return (
    <Field data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>{t("AuditReason.label")}</FieldLabel>
      <Textarea
        id={id}
        name="reason"
        data-change-reason
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-required="true"
        maxLength={500}
        className="min-h-24"
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
      />
      <FieldDescription id={`${id}-hint`}>
        {t("AuditReason.hint")}
      </FieldDescription>
      {error && <FieldError id={`${id}-error`}>{t(error)}</FieldError>}
    </Field>
  );
}
