"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "@repo/i18n";
import type { Exercise, PlanContent } from "@repo/api/profile";
import { Button } from "../kit/Button";
import { useTrainingLocale } from "./common";
import { useShareTrainingPdf } from "./pdf-export";

/** Uses the browser's PDF printer, preserving Persian shaping and the displayed plan version. */
export function PrintTrainingPlan({
  content,
  library,
  version,
}: {
  content: PlanContent;
  library: Exercise[];
  version?: number;
}) {
  const t = useTranslations("Training"),
    fmt = useTrainingLocale();
  const [printing, setPrinting] = useState(false);
  const growth = useTranslations("Growth"),
    share = useShareTrainingPdf(),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(false);
  async function download() {
    setSaving(true);
    setError(false);
    try {
      const { createPlanPdf } = await import("./create-plan-pdf");
      const bytes = await createPlanPdf(
        content,
        library,
        fmt.locale,
        {
          sets: t("sets"),
          reps: t("reps"),
          seconds: t("seconds"),
          kg: t("kg"),
          rest: t("printRest"),
          nutrition: t("nutritionPlan"),
          version: t("version"),
        },
        version,
      );
      await share(bytes);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }
  useEffect(() => {
    if (!printing) return;
    const cleanup = () => setPrinting(false);
    let cancelled = false;
    window.addEventListener("afterprint", cleanup);
    void document.fonts.ready.then(() => {
      if (!cancelled) window.print();
    });
    return () => {
      cancelled = true;
      window.removeEventListener("afterprint", cleanup);
    };
  }, [printing]);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={saving}
        onClick={() => void download()}
      >
        {growth("downloadPdf")}
      </Button>
      {error && <p role="alert">{growth("pdfFailed")}</p>}
      <Button type="button" variant="outline" onClick={() => setPrinting(true)}>
        {t("printPlan")}
      </Button>
      {printing && (
        <>
          <p>{t("printHint")}</p>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setPrinting(false)}
          >
            {t("printClose")}
          </Button>
        </>
      )}
      {printing &&
        createPortal(
          <ReadOnlyTrainingPlan content={content} library={library} print />,
          document.body,
        )}
    </>
  );
}

export function ReadOnlyTrainingPlan({
  content,
  library,
  print = false,
}: {
  content: PlanContent;
  library: Exercise[];
  print?: boolean;
}) {
  const t = useTranslations("Training"),
    fmt = useTrainingLocale();
  return (
    <article
      className={
        print
          ? "training-print"
          : "luma-group p-4 overflow-x-auto [&_section]:my-5 [&_table]:w-full [&_th]:p-2 [&_td]:p-2 [&_td]:text-center [&_h2]:font-semibold"
      }
      dir={fmt.locale === "fa" ? "rtl" : "ltr"}
    >
      <h1>{content.title}</h1>
      {content.note && <p style={{ whiteSpace: "pre-wrap" }}>{content.note}</p>}
      {content.nutrition && (
        <section>
          <h2>{t("nutritionPlan")}</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{content.nutrition}</p>
        </section>
      )}
      {content.days.map((day, index) => (
        <section key={index}>
          <h2>{day.name}</h2>
          <table>
            <thead>
              <tr>
                <th>{t("movement")}</th>
                <th>{t("sets")}</th>
                <th>{t("printTarget")}</th>
                <th>{t("printLoad")}</th>
                <th>{t("printRest")}</th>
              </tr>
            </thead>
            <tbody>
              {day.exercises.map((e) => {
                const movement = library.find((m) => m.id === e.exerciseId);
                return (
                  <tr key={e.id}>
                    <th scope="row">
                      {(fmt.locale === "fa"
                        ? movement?.nameFa
                        : movement?.nameEn) ?? e.exerciseId}
                      {e.group !== "single" && (
                        <p>
                          {t(e.group)} {e.groupId}
                        </p>
                      )}
                      {e.note && (
                        <p style={{ whiteSpace: "pre-wrap" }}>{e.note}</p>
                      )}
                    </th>
                    <td>{fmt.number(e.sets)}</td>
                    <td>
                      {fmt.number(e.reps ?? e.seconds ?? 0)}{" "}
                      {t(e.reps === null ? "seconds" : "reps")}
                    </td>
                    <td>
                      {e.load === null
                        ? t("printUnspecified")
                        : `${fmt.number(e.load)} ${t("kg")}`}
                    </td>
                    <td>
                      {fmt.number(e.restSeconds)} {t("seconds")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
    </article>
  );
}
