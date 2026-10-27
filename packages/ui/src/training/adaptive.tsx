"use client";
import { useRef, useState } from "react";
import { useTranslations } from "@repo/i18n";
import {
  useAdaptivePreview,
  useAcceptAdaptive,
  type AdaptivePreferences,
  type Exercise,
} from "@repo/api/profile";
import { NativeSelect } from "../kit/NativeSelect";
import { Button } from "../kit/Button";
import { ErrorNotice } from "../account/common";
import { TrainingCard, TrainingLink, useTrainingLocale } from "./common";

const initial: AdaptivePreferences = {
  goal: "general",
  experience: "beginner",
  minutes: 30,
  equipment: ["bodyweight"],
  avoidMuscles: [],
  excludeExercises: [],
};
const equipment = ["bodyweight", "dumbbell", "band", "mat"] as const;
const muscles = [
  "legs",
  "chest",
  "arms",
  "back",
  "core",
  "shoulders",
  "cardio",
] as const;

export function TrainingAdaptive({
  library,
  online,
}: {
  library: Exercise[];
  online: boolean;
}) {
  const t = useTranslations("Training"),
    fmt = useTrainingLocale();
  const [preferences, setPreferences] = useState<AdaptivePreferences>(initial);
  const preview = useAdaptivePreview(),
    accept = useAcceptAdaptive();
  const generationKey = useRef<string | null>(null),
    acceptanceKey = useRef<string | null>(null),
    busy = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const [accepted, setAccepted] = useState<{
    planId: string;
    assignmentId: string;
  } | null>(null);
  const pending = preview.isPending || accept.isPending;
  function change(next: AdaptivePreferences) {
    setPreferences(next);
    preview.reset();
    accept.reset();
    setAccepted(null);
    generationKey.current = null;
    acceptanceKey.current = null;
  }
  const result = preview.data;
  async function generate() {
    if (busy.current) return;
    busy.current = true;
    setAccepted(null);
    accept.reset();
    acceptanceKey.current = null;
    generationKey.current ??= crypto.randomUUID();
    try {
      await preview.mutateAsync({
        operationId: generationKey.current,
        preferences,
      });
      generationKey.current = null;
      requestAnimationFrame(() => heading.current?.focus());
    } catch {
      /* The mutation renders its error and retains the retry key. */
    } finally {
      busy.current = false;
    }
  }
  async function confirm() {
    if (!result || busy.current) return;
    busy.current = true;
    acceptanceKey.current ??= crypto.randomUUID();
    try {
      setAccepted(
        await accept.mutateAsync({
          id: result.id,
          operationId: acceptanceKey.current,
        }),
      );
    } catch {
      /* Keep the same acceptance key after an uncertain response. */
    } finally {
      busy.current = false;
    }
  }
  return (
    <TrainingCard title={t("adaptiveTitle")}>
      <p className="training-muted">{t("adaptiveHint")}</p>
      <fieldset disabled={pending || !online}>
        <legend className="sr-only">{t("adaptivePreferences")}</legend>
        <div className="training-grid">
          <label>
            {t("adaptiveGoal")}
            <NativeSelect
              value={preferences.goal}
              onChange={(e) =>
                change({
                  ...preferences,
                  goal: e.target.value as AdaptivePreferences["goal"],
                })
              }
            >
              {(["general", "strength", "hypertrophy"] as const).map((v) => (
                <option key={v} value={v}>
                  {t(`adaptiveGoal_${v}`)}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label>
            {t("adaptiveExperience")}
            <NativeSelect
              value={preferences.experience}
              onChange={(e) =>
                change({
                  ...preferences,
                  experience: e.target
                    .value as AdaptivePreferences["experience"],
                })
              }
            >
              {(["beginner", "intermediate", "advanced"] as const).map((v) => (
                <option key={v} value={v}>
                  {t(`adaptiveExperience_${v}`)}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label>
            {t("adaptiveDuration")}
            <NativeSelect
              value={preferences.minutes}
              onChange={(e) =>
                change({ ...preferences, minutes: Number(e.target.value) })
              }
            >
              {[15, 30, 45, 60, 90].map((v) => (
                <option key={v} value={v}>
                  {t("adaptiveMinutes", { count: v })}
                </option>
              ))}
            </NativeSelect>
          </label>
        </div>
        <fieldset>
          <legend>{t("adaptiveEquipment")}</legend>
          <div className="training-actions">
            {equipment.map((v) => (
              <label key={v}>
                <input
                  type="checkbox"
                  checked={preferences.equipment.includes(v)}
                  onChange={(e) =>
                    change({
                      ...preferences,
                      equipment: e.target.checked
                        ? [...preferences.equipment, v]
                        : preferences.equipment.filter((x) => x !== v),
                    })
                  }
                />
                {t(`adaptiveEquipment_${v}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>{t("adaptiveAvoid")}</legend>
          <div className="training-actions">
            {muscles.map((v) => (
              <label key={v}>
                <input
                  type="checkbox"
                  checked={preferences.avoidMuscles.includes(v)}
                  onChange={(e) =>
                    change({
                      ...preferences,
                      avoidMuscles: e.target.checked
                        ? [...preferences.avoidMuscles, v]
                        : preferences.avoidMuscles.filter((x) => x !== v),
                    })
                  }
                />
                {t(`adaptiveMuscle_${v}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <Button
          type="button"
          disabled={!preferences.equipment.length || pending || !online}
          onClick={() => void generate()}
        >
          {t(pending ? "adaptiveWorking" : "adaptiveGenerate")}
        </Button>
      </fieldset>
      {!online && <p role="status">{t("adaptiveOnline")}</p>}
      <ErrorNotice error={preview.error || accept.error} />
      {result && (
        <section aria-live="polite">
          <h3 ref={heading} tabIndex={-1}>
            {t(`adaptiveStatus_${result.status}`)}
          </h3>
          <p className="training-muted">
            {t("adaptiveEvidence", { count: result.historySessions })}
          </p>
          {!!result.movements.length && (
            <>
              <p>{t("adaptiveEstimate", { count: result.estimatedMinutes })}</p>
              <ul>
                {result.movements.map((m) => {
                  const exercise = library.find((e) => e.id === m.exerciseId);
                  return (
                    <li key={m.exerciseId}>
                      <strong>
                        {(fmt.locale === "fa"
                          ? exercise?.nameFa
                          : exercise?.nameEn) ?? m.exerciseId}
                      </strong>
                      <p>
                        {t("adaptivePrescription", {
                          sets: fmt.number(m.sets),
                          target: fmt.number(m.reps ?? m.seconds ?? 0),
                          unit: t(m.reps === null ? "seconds" : "reps"),
                        })}
                        {m.load !== null
                          ? ` · ${fmt.number(m.load)} ${t("kg")}`
                          : ""}
                      </p>
                      <p className="training-muted">
                        {t(`adaptiveReason_${m.reason}`)}
                      </p>
                    </li>
                  );
                })}
              </ul>
              {accepted ? (
                <TrainingLink
                  href={`/training/workout?assignment=${accepted.assignmentId}&day=0`}
                >
                  {t("start")}
                </TrainingLink>
              ) : (
                <Button
                  type="button"
                  onClick={() => void confirm()}
                  disabled={pending || !online}
                >
                  {t(accept.isPending ? "adaptiveWorking" : "adaptiveAccept")}
                </Button>
              )}
            </>
          )}
        </section>
      )}
    </TrainingCard>
  );
}
