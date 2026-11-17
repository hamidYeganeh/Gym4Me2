"use client";

import Link from "next/link";

import { getLocaleConfig, useLocale, useTranslations } from "@repo/i18n";

import { ListFilters, ListPagination, useAdminList } from "../../lib/ListControls";
import { resourceCatalogs, resourceGroups, resourceKinds } from "./resource-catalogs";

export const ResourceDirectory = () => {
  const locale = useLocale();
  const t = useTranslations("Resources");
  const list = useAdminList(
    resourceKinds,
    (kind) => `${t(kind)} ${kind}`,
    (kind) => resourceCatalogs[kind].group,
  );
  return (
    <main {...getLocaleConfig(locale)} className="mx-auto grid max-w-screen-2xl gap-6 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold sm:text-3xl">{t("title")}</h1>
      <ListFilters
        list={list}
        label={locale === "fa" ? "دسته" : "Category"}
        options={resourceGroups.map((group) => [group, t(group)])}
      />
      {!list.count && <p>{t("noResults")}</p>}
      {resourceGroups.map((group) => {
        const rows = list.rows.filter((kind) => resourceCatalogs[kind].group === group);
        if (!rows.length) return null;
        return (
          <section key={group} className="grid gap-3">
            <h2 className="text-sm font-semibold text-theme-muted-foreground">{t(group)}</h2>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((kind) => (
                <li key={kind}>
                  <Link
                    href={`/club/resources/${kind}`}
                    className="block rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-sm hover:bg-neutral-800"
                  >
                    {t(kind)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <ListPagination list={list} />
    </main>
  );
};
