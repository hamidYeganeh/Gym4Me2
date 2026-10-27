"use client";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "@repo/i18n";
import type { PlanContent, Exercise } from "@repo/api/profile";
import { useSportsQuery } from "@repo/api/sports";
import { PrintTrainingPlan, ReadOnlyTrainingPlan } from "@repo/ui/training";
import { LumaPage, QueryState } from "./common";

export function PreviousProgramDetail() {
  const id = useSearchParams().get("id"),
    t = useTranslations("SimpleApp"),
    training = useTranslations("Training");
  const query = useSportsQuery<{
    content: PlanContent;
    version: number;
    exercises: Exercise[];
  }>(`profile/program-history/${id}`, undefined, Boolean(id));
  const program = query.data;
  return (
    <LumaPage
      title={program?.content.title ?? t("programHistory")}
      back="/programs"
    >
      {!id ? (
        <p role="alert">{training("notFound")}</p>
      ) : (
        <QueryState query={query}>
          {program && (
            <>
              <ReadOnlyTrainingPlan
                content={program.content}
                library={program.exercises}
              />
              <div className="my-4 flex flex-wrap gap-3">
                <PrintTrainingPlan
                  content={program.content}
                  version={program.version}
                  library={program.exercises}
                />
              </div>
            </>
          )}
        </QueryState>
      )}
    </LumaPage>
  );
}
