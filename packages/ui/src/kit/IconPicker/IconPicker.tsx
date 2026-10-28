"use client";
import { useState } from "react";
import { useTranslations } from "@repo/i18n";
import { catalogIcon, sandowIconNames } from "../../icons/catalog";
import { Button } from "../Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../Dialog";
import { Search } from "../Search";

/** Search the actual bundled font, with bounded rendering for large catalogs. */
export function IconPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (name: string | null) => void;
}) {
  const t = useTranslations("CatalogIcons");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(80);
  const names = sandowIconNames.filter((name) =>
    name
      .toLowerCase()
      .includes(query.trim().toLowerCase().replace(/[ -]/g, "")),
  );
  const Selected = catalogIcon(value);
  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">{t("label")}</span>
      <div className="flex items-center gap-3">
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          <Selected size={24} />
          {t("choose")}
        </Button>
        {value && (
          <>
            <span className="truncate text-xs text-muted-foreground" dir="ltr">
              {value}
            </span>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onChange(null)}
            >
              {t("reset")}
            </Button>
          </>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <Search
            aria-label={t("search")}
            placeholder={t("search")}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(80);
            }}
          />
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {names.slice(0, limit).map((name) => {
              const Icon = catalogIcon(name);
              return (
                <button
                  key={name}
                  type="button"
                  aria-label={name}
                  aria-pressed={value === name}
                  title={name}
                  className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl bg-secondary p-2 text-secondary-foreground outline-offset-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring aria-pressed:ring-2 aria-pressed:ring-primary"
                  onClick={() => {
                    onChange(name);
                    setOpen(false);
                  }}
                >
                  <Icon size={28} />
                  <span className="w-full truncate text-[10px]" dir="ltr">
                    {name.replace(/Icon$/, "")}
                  </span>
                </button>
              );
            })}
          </div>
          {!names.length && (
            <p className="text-muted-foreground">{t("empty")}</p>
          )}
          {names.length > limit && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setLimit((n) => n + 80)}
            >
              {t("more")}
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
