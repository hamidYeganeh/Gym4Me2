"use client";
import { useId } from "react";
import { useTranslations } from "@repo/i18n";
import type { ClubFaqDto } from "@repo/api/catalog";
import { ChevronDownIcon } from "../../icons";

export function ClubFaq({ items }: { items: ClubFaqDto[] }) {
  const t = useTranslations("ClubFaq"), group = useId();
  if (!items.length) return null;
  return (
    <section className="club-faq" aria-label={t("title")}>
      <h2 className="text-2xl font-semibold">{t("title")}</h2>
      {items.map((item, index) => (
        <details key={`${index}-${item.question}`} name={group} className="club-faq-item">
          <summary className="club-faq-question">
            <span>{item.question}</span>
            <span className="club-faq-toggle" aria-hidden="true"><ChevronDownIcon size={24} /></span>
          </summary>
          <div className="club-faq-answer">{item.answer}</div>
        </details>
      ))}
    </section>
  );
}
