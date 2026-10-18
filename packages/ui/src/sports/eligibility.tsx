"use client";
import { useId, useState } from "react";
import { useTranslations } from "@repo/i18n";
import type { ServiceEligibilityDto } from "@repo/api/sports";
import { Input } from "../kit/Input";
import { Textarea } from "../kit/Textarea";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "../kit/Field";

const kinds = ["experience", "equipment", "preparation"] as const;

export function readServiceEligibility(form: FormData): ServiceEligibilityDto {
  const minimum = String(form.get("minimumAge") ?? "").trim();
  const maximum = String(form.get("maximumAge") ?? "").trim();
  return {
    minimumAge: minimum === "" ? null : Number(minimum),
    maximumAge: maximum === "" ? null : Number(maximum),
    prerequisites: kinds.flatMap((kind) =>
      String(form.get(`prerequisite-${kind}`) ?? "")
        .split("\n")
        .map((description) => description.trim())
        .filter(Boolean)
        .map((description) => ({ kind, description })),
    ),
  };
}

export function ServiceEligibilityFields({
  value,
}: {
  value?: ServiceEligibilityDto;
}) {
  const t = useTranslations("Luma");
  const id = useId();
  const [minimum, setMinimum] = useState(value?.minimumAge?.toString() ?? "");
  const validatePrerequisites = (changed: HTMLTextAreaElement) => {
    const form = changed.form;
    if (!form) return;
    const fields = kinds
      .map((kind) => form.elements.namedItem(`prerequisite-${kind}`))
      .filter(
        (field): field is HTMLTextAreaElement =>
          field instanceof HTMLTextAreaElement,
      );
    const lines = (text: string) =>
      text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    const count = fields.reduce(
      (total, field) => total + lines(field.value).length,
      0,
    );
    for (const field of fields) {
      field.setCustomValidity(
        count > 12
          ? t("prerequisiteCountError")
          : lines(field.value).some((line) => line.length > 200)
            ? t("prerequisiteLengthError")
            : "",
      );
    }
  };
  return (
    <FieldSet className="sm:col-span-2">
      <FieldLegend>{t("eligibility")}</FieldLegend>
      <FieldDescription id={`${id}-hint`}>
        {t("eligibilityHostHint")}
      </FieldDescription>
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${id}-minimum`}>{t("minimumAge")}</FieldLabel>
          <Input
            id={`${id}-minimum`}
            className="min-h-11"
            name="minimumAge"
            type="number"
            min="0"
            max="120"
            value={minimum}
            onChange={(event) => {
              event.target.setCustomValidity("");
              const maximum =
                event.currentTarget.form?.elements.namedItem("maximumAge");
              if (maximum instanceof HTMLInputElement)
                maximum.setCustomValidity("");
              setMinimum(event.target.value);
            }}
            onInvalid={(event) =>
              event.currentTarget.setCustomValidity(t("ageRangeError"))
            }
            aria-describedby={`${id}-hint`}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-maximum`}>{t("maximumAge")}</FieldLabel>
          <Input
            id={`${id}-maximum`}
            className="min-h-11"
            name="maximumAge"
            type="number"
            min={minimum || "0"}
            max="120"
            defaultValue={value?.maximumAge ?? ""}
            onChange={(event) => event.currentTarget.setCustomValidity("")}
            onInvalid={(event) =>
              event.currentTarget.setCustomValidity(t("ageRangeError"))
            }
            aria-describedby={`${id}-hint`}
          />
        </Field>
        {kinds.map((kind) => (
          <Field key={kind} className="sm:col-span-2">
            <FieldLabel htmlFor={`${id}-${kind}`}>
              {t(`prerequisiteKinds.${kind}`)}
            </FieldLabel>
            <Textarea
              id={`${id}-${kind}`}
              name={`prerequisite-${kind}`}
              rows={2}
              maxLength={2411}
              onChange={(event) => validatePrerequisites(event.currentTarget)}
              defaultValue={value?.prerequisites
                .filter((item) => item.kind === kind)
                .map((item) => item.description)
                .join("\n")}
              aria-describedby={`${id}-prerequisites`}
            />
          </Field>
        ))}
        <FieldDescription id={`${id}-prerequisites`} className="sm:col-span-2">
          {t("prerequisiteEntryHint")}
        </FieldDescription>
      </FieldGroup>
    </FieldSet>
  );
}

export function ServiceEligibilitySummary({
  value,
}: {
  value?: ServiceEligibilityDto;
}) {
  const t = useTranslations("Luma");
  if (!value) return null;
  const { minimumAge, maximumAge, prerequisites } = value;
  if (minimumAge === null && maximumAge === null && !prerequisites.length)
    return null;
  const age =
    minimumAge !== null && maximumAge !== null
      ? t("ageBetween", { minimum: minimumAge, maximum: maximumAge })
      : minimumAge !== null
        ? t("ageFrom", { minimum: minimumAge })
        : maximumAge !== null
          ? t("ageUntil", { maximum: maximumAge })
          : null;
  return (
    <section aria-label={t("eligibility")} className="my-6 flex flex-col gap-4">
      <h2 className="font-semibold">{t("eligibility")}</h2>
      {age && <p>{age}</p>}
      {kinds.map((kind) => {
        const items = prerequisites.filter((item) => item.kind === kind);
        if (!items.length) return null;
        return (
          <div key={kind} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">
              {t(`prerequisiteKinds.${kind}`)}
            </h3>
            <ul className="list-disc ps-5 leading-7">
              {items.map((item, index) => (
                <li key={`${kind}-${index}`}>{item.description}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
