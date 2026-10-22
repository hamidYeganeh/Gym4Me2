"use client";
import Link from "next/link";
import { useTranslations } from "@repo/i18n";
import { useTaxonomies } from "@repo/api/catalog";

export function CategoryCarousel({
  selected = "",
  onSelect,
}: {
  locale: string;
  selected?: string;
  onSelect?: (value: string) => void;
}) {
  const t = useTranslations("Copy");
  const query = useTaxonomies("club-categories");
  if (!query.data?.length) return null;
  return (
    <section className="discovery-categories" aria-label={t("categories")}>
      {query.data.map((category) =>
        onSelect ? (
          <button
            key={category.id}
            type="button"
            aria-pressed={selected === category.id}
            onClick={() =>
              onSelect(selected === category.id ? "" : category.id)
            }
          >
            {category.name}
          </button>
        ) : (
          <Link
            key={category.id}
            href={`/discovery?category=${category.id}`}
            scroll={false}
          >
            {category.name}
          </Link>
        ),
      )}
    </section>
  );
}
