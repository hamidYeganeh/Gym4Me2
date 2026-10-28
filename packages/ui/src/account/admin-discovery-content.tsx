"use client";
import { useState } from "react";
import {
  useDiscoveryContent,
  useSaveDiscoveryContent,
  type DiscoveryContent,
  type DiscoveryContentRow,
  type DiscoveryPage,
} from "@repo/api/catalog";
import { useTranslations } from "@repo/i18n";
import { Button } from "../kit/Button";
import { Input } from "../kit/Input";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { Field, FieldLabel } from "../kit/Field";
import { Loading, QueryError, ErrorNotice } from "./common";
const blank: DiscoveryContent = {
  page: "home",
  title: "",
  subtitle: "",
  carouselType: "carousel",
  imageRatio: "16/9",
  position: 0,
  published: false,
  slides: [{ title: "", subtitle: "", image: "", href: "" }],
};
const pages: DiscoveryPage[] = ["home", "clubs", "coaches", "classes", "map"];
export function AdminDiscoveryContent() {
  const t = useTranslations("DiscoveryAdmin");
  const query = useDiscoveryContent(undefined, true);
  const save = useSaveDiscoveryContent();
  const [selected, setSelected] = useState<DiscoveryContentRow>();
  const [draft, setDraft] = useState<DiscoveryContent>(blank);
  const [page, setPage] = useState<DiscoveryPage>("home");
  const edit = (row?: DiscoveryContentRow) => {
    setSelected(row);
    setDraft(
      row
        ? structuredClone(row.config)
        : { ...blank, page, slides: [{ ...blank.slides[0]! }] },
    );
    save.reset();
  };
  const update = <K extends keyof DiscoveryContent>(
    key: K,
    value: DiscoveryContent[K],
  ) => setDraft({ ...draft, [key]: value });
  return (
    <main className="mx-auto grid max-w-5xl gap-6 p-5">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Button disabled={save.isPending} onClick={() => edit()}>
          {t("create")}
        </Button>
      </header>
      <p className="text-muted-foreground">{t("hint")}</p>
      <NativeSelect
        aria-label={t("page")}
        value={page}
        onChange={(e) => setPage(e.target.value as DiscoveryPage)}
      >
        {pages.map((v) => (
          <NativeSelectOption key={v} value={v}>
            {t(v)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <QueryError error={query.error} retry={query.refetch} />
      {query.isLoading ? (
        <Loading />
      ) : (
        <div className="grid gap-3">
          {query.data
            ?.filter((row) => row.config.page === page)
            .map((row) => (
              <article
                key={row.id}
                className="flex items-center justify-between gap-4 rounded-2xl border p-4"
              >
                <div>
                  <h2 className="font-semibold">{row.config.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t(row.config.published ? "published" : "draft")} ·{" "}
                    {row.config.position}
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={save.isPending}
                  onClick={() => edit(row)}
                >
                  {t("edit")}
                </Button>
              </article>
            ))}
        </div>
      )}
      <form
        className="grid gap-5 rounded-3xl border bg-card p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await save.mutateAsync({
              id: selected?.id,
              revision: selected?.revision,
              content: draft,
            });
            edit();
          } catch {}
        }}
      >
        <h2 className="text-xl font-semibold">
          {t(selected ? "edit" : "create")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>{t("page")}</FieldLabel>
            <NativeSelect
              aria-label={t("page")}
              value={draft.page}
              onChange={(e) => update("page", e.target.value as DiscoveryPage)}
            >
              {pages.map((v) => (
                <NativeSelectOption key={v} value={v}>
                  {t(v)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Input
            label={t("heading")}
            value={draft.title}
            maxLength={160}
            required
            onChange={(e) => update("title", e.target.value)}
          />
          <Input
            label={t("subtitle")}
            value={draft.subtitle}
            maxLength={500}
            onChange={(e) => update("subtitle", e.target.value)}
          />
          <Input
            label={t("position")}
            type="number"
            min={0}
            max={1000}
            value={draft.position}
            required
            onChange={(e) => update("position", Number(e.target.value))}
          />
          <Field>
            <FieldLabel>{t("layout")}</FieldLabel>
            <NativeSelect
              aria-label={t("layout")}
              value={draft.carouselType}
              onChange={(e) =>
                update(
                  "carouselType",
                  e.target.value as DiscoveryContent["carouselType"],
                )
              }
            >
              {(["single", "carousel", "grid"] as const).map((v) => (
                <NativeSelectOption key={v} value={v}>
                  {t(v)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel>{t("ratio")}</FieldLabel>
            <NativeSelect
              aria-label={t("ratio")}
              value={draft.imageRatio}
              onChange={(e) =>
                update(
                  "imageRatio",
                  e.target.value as DiscoveryContent["imageRatio"],
                )
              }
            >
              {["16/9", "4/3", "1/1", "3/4"].map((v) => (
                <NativeSelectOption key={v} value={v}>
                  {v}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>
        {draft.slides.map((slide, index) => (
          <fieldset
            key={index}
            className="grid gap-4 rounded-2xl bg-muted/40 p-4"
          >
            <legend>
              {t("slide")} {index + 1}
            </legend>
            {(["title", "subtitle", "image", "href"] as const).map((key) => (
              <Input
                key={key}
                label={t(key === "title" ? "heading" : key)}
                type={key === "image" ? "url" : "text"}
                required={key === "image"}
                pattern={
                  key === "image"
                    ? "https://.*"
                    : key === "href"
                      ? "/.*"
                      : undefined
                }
                maxLength={key === "image" ? 2000 : key === "title" ? 160 : 500}
                value={slide[key]}
                onChange={(e) =>
                  update(
                    "slides",
                    draft.slides.map((v, i) =>
                      i === index ? { ...v, [key]: e.target.value } : v,
                    ),
                  )
                }
              />
            ))}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={index === 0 || save.isPending}
                onClick={() => {
                  const slides = [...draft.slides];
                  [slides[index - 1], slides[index]] = [
                    slides[index]!,
                    slides[index - 1]!,
                  ];
                  update("slides", slides);
                }}
              >
                {t("moveUp")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={draft.slides.length === 1 || save.isPending}
                onClick={() =>
                  update(
                    "slides",
                    draft.slides.filter((_, i) => i !== index),
                  )
                }
              >
                {t("remove")}
              </Button>
            </div>
          </fieldset>
        ))}
        <Button
          type="button"
          variant="outline"
          disabled={draft.slides.length >= 20 || save.isPending}
          onClick={() =>
            update("slides", [
              ...draft.slides,
              { title: "", subtitle: "", image: "", href: "" },
            ])
          }
        >
          {t("addSlide")}
        </Button>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(e) => update("published", e.target.checked)}
          />
          {t("published")}
        </label>
        <ErrorNotice error={save.error} />
        <div className="flex gap-3">
          <Button disabled={save.isPending}>{t("save")}</Button>
          {selected && (
            <Button
              type="button"
              variant="destructive"
              disabled={save.isPending}
              onClick={async () => {
                try {
                  await save.mutateAsync({
                    id: selected.id,
                    revision: selected.revision,
                    deleted: true,
                  });
                  edit();
                } catch {}
              }}
            >
              {t("remove")}
            </Button>
          )}
        </div>
      </form>
    </main>
  );
}
