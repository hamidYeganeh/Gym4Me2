"use client";
import { useDeferredValue, useState } from "react";
import { useLocale, useTranslations } from "@repo/i18n";
import { useTrainingQuery } from "@repo/api/profile";
import { Button } from "../kit/Button";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { Field } from "../advanced-business/forms";
import { GrowthForm } from "../growth/form";
import { Loading, QueryError } from "../account/common";
import { TrainingCard } from "./common";
type Food = {
  id: string;
  nameFa: string | null;
  nameEn: string;
  per100g: { calories: number; protein: number; carbs: number; fat: number };
  sourceUrl: string;
};
export function FoodPicker({
  date,
  meal,
  online,
}: {
  date: string;
  meal: string;
  online: boolean;
}) {
  const t = useTranslations("Growth"),
    training = useTranslations("Training"),
    locale = useLocale(),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(""),
    query = useDeferredValue(search);
  const q = useTrainingQuery<{
      items: Food[];
      total: number;
      hasMore: boolean;
    }>("profile/nutrition/foods", { q: query, page: String(page) }, online),
    food = q.data?.items.find((f) => f.id === selected) ?? q.data?.items[0];
  return (
    <TrainingCard title={t("foodCatalog")}>
      <p>{t("foodSourceHint")}</p>
      {!online && <p role="status">{training("nutritionOnline")}</p>}
      <Field name="foodSearch" label={t("foodSearch")}>
        <input
          className="min-h-11 rounded-xl border bg-background px-3"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
            setSelected("");
          }}
        />
      </Field>
      {q.error ? (
        <QueryError error={q.error} retry={() => void q.refetch()} />
      ) : q.isLoading ? (
        <Loading />
      ) : !food ? (
        <p>{t("noFood")}</p>
      ) : (
        <>
          <Field name="foodChoice" label={t("foodChoose")}>
            <NativeSelect
              value={food.id}
              onChange={(e) => setSelected(e.target.value)}
            >
              {q.data?.items.map((f) => (
                <NativeSelectOption key={f.id} value={f.id}>
                  {locale === "fa" ? (f.nameFa ?? f.nameEn) : f.nameEn}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <p>
            {t("per100g")}:{" "}
            {Object.entries(food.per100g)
              .map(
                ([k, v]) =>
                  `${t(k as "calories" | "protein" | "carbs" | "fat")}: ${new Intl.NumberFormat(locale).format(v)}`,
              )
              .join(" · ")}
          </p>
          <a
            href={food.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center underline"
          >
            {t("foodSource")}
          </a>
          <GrowthForm
            key={food.id + date + meal}
            disabled={!online}
            path={`profile/nutrition/foods/${food.id}/entries`}
            label={t("logFood")}
            build={(f) => ({
              eatenOn: date,
              meal: String(f.get("meal")),
              grams: Number(f.get("grams")),
              locale,
            })}
          >
            <Field name="meal" label={training("nutritionMeal")}>
              <NativeSelect name="meal" defaultValue={meal}>
                {(["breakfast", "lunch", "dinner", "snack"] as const).map(
                  (value) => (
                    <NativeSelectOption key={value} value={value}>
                      {training(`nutritionMeal_${value}`)}
                    </NativeSelectOption>
                  ),
                )}
              </NativeSelect>
            </Field>
            <Field
              name="grams"
              type="number"
              min="0.01"
              step="0.01"
              max="20000"
              label={t("foodGrams")}
              defaultValue="100"
            />
          </GrowthForm>
          <div className="flex gap-3">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => {
                setPage((p) => p - 1);
                setSelected("");
              }}
            >
              {t("previous")}
            </Button>
            <Button
              variant="outline"
              disabled={!q.data?.hasMore}
              onClick={() => {
                setPage((p) => p + 1);
                setSelected("");
              }}
            >
              {t("next")}
            </Button>
          </div>
        </>
      )}
    </TrainingCard>
  );
}
