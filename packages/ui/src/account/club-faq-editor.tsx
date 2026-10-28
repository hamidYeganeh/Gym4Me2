"use client";
import { useId } from "react";
import { useTranslations } from "@repo/i18n";
import type { ClubFaqDto } from "@repo/api/catalog";
import { Input } from "../kit/Input";
import { Textarea } from "../kit/Textarea";
import { Field, FieldLabel } from "../kit/Field";
import { Button } from "../kit/Button";
import { PlusIcon, Trash1Icon, ArrowUpIcon, ArrowDownIcon } from "../icons";

export function ClubFaqEditor({ value, onChange }: { value: ClubFaqDto[]; onChange: (value: ClubFaqDto[]) => void }) {
  const t = useTranslations("ClubFaq"), id = useId();
  const update = (index: number, patch: Partial<ClubFaqDto>) => onChange(value.map((item, i) => i === index ? { ...item, ...patch } : item));
  const move = (index: number, offset: number) => {
    const next = [...value];
    [next[index], next[index + offset]] = [next[index + offset]!, next[index]!];
    onChange(next);
  };
  return (
    <section className="space-y-4" aria-label={t("title")}>
      <h3 className="text-lg font-semibold">{t("title")}</h3>
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
      {value.map((item, index) => (
        <div key={index} className="space-y-3 rounded-2xl bg-muted/40 p-4">
          <Input label={t("question", { number: index + 1 })} value={item.question} required maxLength={300}
            onChange={(e) => update(index, { question: e.target.value })} />
          <Field>
            <FieldLabel htmlFor={`${id}-${index}`}>{t("answer")}</FieldLabel>
            <Textarea id={`${id}-${index}`} value={item.answer} required maxLength={3000} rows={4}
              onChange={(e) => update(index, { answer: e.target.value })} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" disabled={index === 0} onClick={() => move(index, -1)} aria-label={t("up")}><ArrowUpIcon /></Button>
            <Button type="button" variant="ghost" disabled={index === value.length - 1} onClick={() => move(index, 1)} aria-label={t("down")}><ArrowDownIcon /></Button>
            <Button type="button" variant="ghost" onClick={() => onChange(value.filter((_, i) => i !== index))}><Trash1Icon />{t("remove")}</Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" disabled={value.length >= 20} onClick={() => onChange([...value, { question: "", answer: "" }])}><PlusIcon />{t("add")}</Button>
    </section>
  );
}
