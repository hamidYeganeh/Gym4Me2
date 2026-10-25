"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpLeft, Dumbbell } from "lucide-react";
import { useTranslations } from "@repo/i18n";
import { useTrainingQuery } from "@repo/api/profile";
import { QueryState, useLuma } from "./common";
import { BookingCalendar } from "./booking-calendar";
export function PersonalAgenda() {
  const t = useTranslations("LumaDesign"),
    luma = useLuma();
  const training = useTrainingQuery<{
    active: { id: string; title: string } | null;
    plan: { id?: string; title: string } | null;
  }>("profile/training/home-summary");
  const active = training.data?.active,
    plan = training.data?.plan;
  const workoutHref = active
    ? `/training/workout?id=${active.id}`
    : plan?.id
      ? `/training/workout?assignment=${plan.id}&day=0`
      : "/training";
  return (
    <section className="personal-agenda" aria-label={t("schedule")}>
      <BookingCalendar title={t("schedule")} />
      <QueryState query={training} compact>
        <article className="agenda-workout">
          <Link className="agenda-workout-main" href={workoutHref}>
            <Image
              src="/images/clubs/training.webp"
              alt=""
              width={72}
              height={72}
            />
            <div>
              <span className="agenda-eyebrow">
                <Dumbbell size={13} />
                {active ? t("ongoing") : t("nextWorkout")}
              </span>
              <h3>{active?.title ?? plan?.title ?? t("yourDay")}</h3>
              <span className="luma-meta">
                {active ? luma("continue") : t("openTraining")}
              </span>
            </div>
            <ArrowUpLeft className="ltr:rotate-90" size={20} />
          </Link>
        </article>
      </QueryState>
    </section>
  );
}
