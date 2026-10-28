"use client";
import { useState } from "react";
import { useTranslations } from "@repo/i18n";
import type { PhoneDto } from "@repo/api/catalog";
import { Button } from "../kit/Button";
import { Input } from "../kit/Input";
export function ClubPhoneEditor({ initial }: { initial: PhoneDto[] }) {
  const t = useTranslations("BusinessFlow");
  const [rows, setRows] = useState(
    initial.map((phone, index) => ({ ...phone, key: String(index) })),
  );
  return (
    <fieldset className="grid gap-4">
      <legend className="mb-4 font-semibold">{t("phones")}</legend>
      <input
        type="hidden"
        name="labeledPhones"
        value={JSON.stringify(rows.map(({ key, ...phone }) => phone))}
      />
      {rows.map((phone, index) => (
        <div key={phone.key} className="grid gap-3 rounded-2xl bg-muted/40 p-4">
          <Input
            label={t("phoneLabel")}
            placeholder={t("labelExamples")}
            maxLength={80}
            value={phone.label ?? ""}
            onChange={(e) =>
              setRows(
                rows.map((r, i) =>
                  i === index ? { ...r, label: e.target.value } : r,
                ),
              )
            }
          />
          <Input
            label={t("phoneNumber")}
            type="tel"
            dir="ltr"
            required
            maxLength={30}
            value={phone.number}
            onChange={(e) =>
              setRows(
                rows.map((r, i) =>
                  i === index ? { ...r, number: e.target.value } : r,
                ),
              )
            }
          />
          <Input
            label={t("extension")}
            dir="ltr"
            inputMode="numeric"
            pattern="[0-9۰-۹٠-٩]*"
            maxLength={10}
            value={phone.extension ?? ""}
            onChange={(e) =>
              setRows(
                rows.map((r, i) =>
                  i === index ? { ...r, extension: e.target.value || null } : r,
                ),
              )
            }
          />
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="radio"
              name="primaryContact"
              checked={phone.isPrimary}
              onChange={() =>
                setRows(rows.map((r, i) => ({ ...r, isPrimary: i === index })))
              }
            />
            {t("primaryPhone")}
          </label>
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              setRows(
                rows
                  .filter((_, i) => i !== index)
                  .map((r, i) => ({
                    ...r,
                    isPrimary: phone.isPrimary ? i === 0 : r.isPrimary,
                  })),
              )
            }
          >
            {t("remove")}
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        disabled={rows.length >= 10}
        onClick={() =>
          setRows([
            ...rows,
            {
              key: crypto.randomUUID(),
              number: "",
              label: "",
              extension: null,
              isPrimary: rows.length === 0,
            },
          ])
        }
      >
        {t("addPhone")}
      </Button>
    </fieldset>
  );
}
