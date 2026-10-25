"use client";
import { useRef, useState } from "react";
import { useTranslations } from "@repo/i18n";
import {
  useTrainingQuery,
  useNutritionEntry,
  useRemoveNutrition,
  type NutritionDay,
  type NutritionEntryInput,
  type Assignment,
} from "@repo/api/profile";
import { NativeSelect } from "../kit/NativeSelect";
import { FoodPicker } from "./food-picker";
import { Button } from "../kit/Button";
import { ErrorNotice, Loading, QueryError } from "../account/common";
import {
  TrainingCard,
  TrainingEmpty,
  trainingToday,
  useTrainingLocale,
  useTrainingOnline,
} from "./common";
const nutrients = ["calories", "protein", "carbs", "fat"] as const;
export function TrainingNutrition({ plans }: { plans: Assignment[] }) {
  const t = useTranslations("Training"),
    fmt = useTrainingLocale(),
    online = useTrainingOnline();
  const [date, setDate] = useState(trainingToday),
    [meal, setMeal] = useState<NutritionEntryInput["meal"]>("breakfast");
  const [values, setValues] = useState({
    name: "",
    grams: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });
  const add = useNutritionEntry(),
    remove = useRemoveNutrition();
  const key = useRef<string | null>(null),
    busy = useRef(false),
    form = useRef<HTMLFormElement>(null);
  const removalKeys = useRef(new Map<string, string>());
  const q = useTrainingQuery<NutritionDay>(
    "profile/nutrition",
    { date },
    online,
  );
  const pending = add.isPending || remove.isPending;
  function edit(name: keyof typeof values, value: string) {
    key.current = null;
    add.reset();
    setValues((v) => ({ ...v, [name]: value }));
  }
  async function save() {
    if (busy.current) return;
    busy.current = true;
    key.current ??= crypto.randomUUID();
    try {
      await add.mutateAsync({
        operationId: key.current,
        eatenOn: date,
        meal,
        name: values.name,
        grams: Number(values.grams),
        per100g: {
          calories: Number(values.calories),
          protein: Number(values.protein),
          carbs: Number(values.carbs),
          fat: Number(values.fat),
        },
      });
      key.current = null;
      setValues({
        name: "",
        grams: "",
        calories: "",
        protein: "",
        carbs: "",
        fat: "",
      });
      form.current?.querySelector("input")?.focus();
    } catch {
      /* Retain the payload and key for a safe retry. */
    } finally {
      busy.current = false;
    }
  }
  async function erase(entry: NutritionDay["entries"][number]) {
    if (busy.current) return;
    busy.current = true;
    if (!removalKeys.current.has(entry.id))
      removalKeys.current.set(entry.id, crypto.randomUUID());
    try {
      await remove.mutateAsync({
        id: entry.id,
        revision: entry.revision,
        operationId: removalKeys.current.get(entry.id)!,
      });
    } catch {
      /* The error remains visible with the same retry key. */
    } finally {
      busy.current = false;
    }
  }
  return (
    <>
      {plans
        .filter((p) => p.content.nutrition)
        .map((p) => (
          <TrainingCard key={p.id} title={t("nutritionPlan")}>
            <h3>{p.content.title}</h3>
            <p className="training-muted">
              {t(p.relationshipId ? "coachPlan" : "personalPlan")} ·{" "}
              {t("version")} {fmt.number(p.version)}
            </p>
            <p className="whitespace-pre-wrap">{p.content.nutrition}</p>
          </TrainingCard>
        ))}
      <TrainingCard title={t("nutritionTitle")}>
        <p className="training-muted">{t("nutritionHint")}</p>
        <label>
          {t("nutritionDate")}
          <input
            type="date"
            value={date}
            disabled={pending}
            onChange={(e) => {
              if (e.target.value) {
                setDate(e.target.value);
                key.current = null;
                add.reset();
                remove.reset();
              }
            }}
          />
        </label>
        {q.isPending && online ? (
          <Loading />
        ) : q.error ? (
          <QueryError error={q.error} retry={q.refetch} />
        ) : (
          q.data && (
            <dl className="training-grid">
              {nutrients.map((n) => (
                <div key={n}>
                  <dt>{t(`nutrition_${n}`)}</dt>
                  <dd>
                    {fmt.number(Number(q.data!.totals[n]))}{" "}
                    {t(n === "calories" ? "nutritionKcal" : "nutritionGrams")}
                  </dd>
                </div>
              ))}
            </dl>
          )
        )}
        {!online && <p role="status">{t("nutritionOnline")}</p>}
      </TrainingCard>
      <FoodPicker date={date} meal={meal} online={online} />
      <TrainingCard title={t("nutritionAdd")}>
        <form
          ref={form}
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <fieldset disabled={pending || !online}>
            <legend className="sr-only">{t("nutritionAdd")}</legend>
            <div className="training-grid">
              <label>
                {t("nutritionFood")}
                <input
                  required
                  maxLength={160}
                  value={values.name}
                  onChange={(e) => edit("name", e.target.value)}
                />
              </label>
              <label>
                {t("nutritionMeal")}
                <NativeSelect
                  value={meal}
                  onChange={(e) => {
                    key.current = null;
                    add.reset();
                    setMeal(e.target.value as typeof meal);
                  }}
                >
                  {(["breakfast", "lunch", "dinner", "snack"] as const).map(
                    (v) => (
                      <option key={v} value={v}>
                        {t(`nutritionMeal_${v}`)}
                      </option>
                    ),
                  )}
                </NativeSelect>
              </label>
              <label>
                {t("nutritionWeight")}
                <input
                  type="number"
                  required
                  min="0.01"
                  max="20000"
                  step="0.01"
                  value={values.grams}
                  onChange={(e) => edit("grams", e.target.value)}
                />
              </label>
            </div>
            <p>{t("nutritionLabel")}</p>
            <div className="training-grid">
              {nutrients.map((n) => (
                <label key={n}>
                  {t(`nutrition_${n}`)}
                  <input
                    type="number"
                    required
                    min="0"
                    max={n === "calories" ? 1000 : 100}
                    step="0.01"
                    value={values[n]}
                    onChange={(e) => edit(n, e.target.value)}
                  />
                </label>
              ))}
            </div>
            <Button type="submit" disabled={pending || !online}>
              {t(add.isPending ? "adaptiveWorking" : "nutritionSave")}
            </Button>
          </fieldset>
        </form>
        <ErrorNotice error={add.error || remove.error} />
      </TrainingCard>
      <TrainingCard title={t("nutritionEntries")}>
        {!q.data?.entries.length ? (
          <TrainingEmpty>{t("nutritionEmpty")}</TrainingEmpty>
        ) : (
          <ul>
            {q.data.entries.map((e) => (
              <li key={e.id}>
                <strong>{e.name}</strong>
                <p>
                  {t(`nutritionMeal_${e.meal}`)} · {fmt.number(Number(e.grams))}{" "}
                  {t("nutritionGrams")} · {fmt.number(Number(e.calories))}{" "}
                  {t("nutritionKcal")}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending || !online}
                  onClick={() => void erase(e)}
                  aria-label={t("nutritionRemoveNamed", { name: e.name })}
                >
                  {t("nutritionRemove")}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {q.data?.hasMore && <p>{t("nutritionBounded")}</p>}
      </TrainingCard>
    </>
  );
}
