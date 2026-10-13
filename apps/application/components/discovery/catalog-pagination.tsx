"use client";
import { useLocale, useTranslations } from "@repo/i18n";
import { Button } from "@repo/ui/kit/Button";
export function CatalogPagination({
  page,
  onChange,
  next,
  busy,
}: {
  page: number;
  onChange: (page: number) => void;
  next: boolean;
  busy: boolean;
}) {
  const t = useTranslations("Catalog");
  const locale = useLocale();
  if (page === 1 && !next) return null;
  return (
    <nav
      className="flex items-center justify-center gap-3 py-3"
      aria-label={t("pagination")}
    >
      <Button
        variant="outline"
        disabled={page === 1 || busy}
        onClick={() => onChange(page - 1)}
      >
        {t("previous")}
      </Button>
      <span aria-live="polite">
        {new Intl.NumberFormat(locale).format(page)}
      </span>
      <Button
        variant="outline"
        disabled={!next || busy}
        onClick={() => onChange(page + 1)}
      >
        {t("next")}
      </Button>
    </nav>
  );
}
