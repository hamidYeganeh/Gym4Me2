"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "@repo/i18n";
import { useChangeLocale } from "@repo/i18n/client-provider";
import { AnimatedThemeToggler } from "@repo/ui/kit/AnimatedThemeToggler";
import { Button } from "@repo/ui/kit/Button";
import { ClubCard } from "@repo/ui/kit/ClubCard";
import { CoachCard } from "@repo/ui/kit/CoachCard";
import { ClubFeaturedCard } from "@repo/ui/kit/ClubFeaturedCard";
import { ClubBranchCard } from "@repo/ui/kit/ClubBranchCard";
import type { ClubSummaryDto } from "@repo/api/catalog";
import { summaryView } from "../../lib/catalog-view";
import { getCoaches } from "../../lib/coaches";
import { LumaSheet } from "../luma/sheet";

export function Ph0Reference({ summary }: { summary: ClubSummaryDto }) {
  const locale = useLocale(),
    t = useTranslations("Clubs"),
    coachT = useTranslations("Coaches");
  const home = useTranslations("Home"),
    kit = useTranslations("Kit");
  const qa = useTranslations("Ph0Reference");
  const changeLocale = useChangeLocale();
  const [pending, startTransition] = useTransition();
  const [recording, setRecording] = useState(false);
  useEffect(() => {
    const update = (event: Event) => {
      if (event instanceof CustomEvent)
        setRecording(event.detail === "recording");
    };
    window.addEventListener("gym4me:ph0-status", update);
    return () => window.removeEventListener("gym4me:ph0-status", update);
  }, []);
  const [saved, setSaved] = useState(false),
    [outer, setOuter] = useState(false),
    [inner, setInner] = useState(false);
  const club = summaryView(summary, locale);
  const coach = getCoaches(locale, club.id)[0]!;
  const labels = {
    save: t("save"),
    unsave: t("unsave"),
    discover: t("discover"),
  };
  return (
    <main className="flex flex-col gap-8 px-5 py-8" data-ph0-reference>
      <h1>{qa("title")}</h1>
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(() => changeLocale(locale === "fa" ? "en" : "fa"))
          }
        >
          {home("language")}
        </Button>
        <AnimatedThemeToggler label={home("theme")} />
        <Button onClick={() => setOuter(true)}>{qa("outerSheet")}</Button>
        <Button
          disabled={recording}
          aria-pressed={recording}
          onClick={() => window.dispatchEvent(new Event("gym4me:ph0-trace"))}
        >
          {qa(recording ? "recording" : "record")}
        </Button>
        <Button asChild>
          <Link href={club.href!} scroll={false}>
            {t("discover")}
          </Link>
        </Button>
      </div>
      {(["portrait", "compact", "landscape"] as const).map((variant) => (
        <section
          key={variant}
          data-ph0-variant={`club-${variant}`}
          className="grid gap-3"
        >
          <h2>{qa("clubVariant", { variant })}</h2>
          <ClubCard
            club={club}
            variant={variant === "landscape" ? "landscape" : "portrait"}
            size={variant === "compact" ? "compact" : "default"}
            labels={labels}
            saved={saved}
            onSavedChange={setSaved}
            galleryLabel={t("gallery")}
            photoLabel={t("photo")}
          />
        </section>
      ))}
      <section data-ph0-variant="featured">
        <h2>{qa("featured")}</h2>
        <ClubFeaturedCard club={club} viewLabel={t("discover")} />
      </section>
      <section data-ph0-variant="branch">
        <h2>{qa("branch")}</h2>
        <ClubBranchCard
          branch={{
            id: "reference",
            name: qa("branchName"),
            address: club.address,
            photo: club.photos[0],
          }}
          viewLabel={t("discover")}
        />
      </section>
      {(["default", "portrait"] as const).map((variant) => (
        <section
          key={variant}
          data-ph0-variant={`coach-${variant}`}
          className="grid gap-3"
        >
          <h2>{qa("coachVariant", { variant })}</h2>
          <CoachCard
            coach={coach}
            href={`/discovery/coaches/${encodeURIComponent(coach.id)}`}
            variant={variant}
            locale={locale}
            saved={saved}
            onSavedChange={setSaved}
            labels={{
              new: coachT("new"),
              save: coachT("save"),
              unsave: coachT("unsave"),
              certified: coachT("certified"),
              experience: coachT("experience"),
              rating: coachT("rating"),
            }}
          />
        </section>
      ))}
      <section className="grid gap-3" aria-label={qa("themeTokens")}>
        <div
          data-ph0-token="luma-secondary"
          className="p-4"
          style={{
            background: "var(--muted)",
            color:
              "color-mix(in oklch, var(--muted-foreground) 95%, var(--foreground))",
          }}
        >
          {qa("secondarySample")}
        </div>
        {(
          ["background", "card", "muted", "primary", "destructive"] as const
        ).map((token) => (
          <div
            key={token}
            data-ph0-token={token}
            className="p-4"
            style={{
              background: `var(--${token})`,
              color: `var(--${token === "destructive" ? "background" : `${token === "background" ? "" : `${token}-`}foreground`})`,
            }}
          >
            {qa("tokenSample", { token })}
          </div>
        ))}
      </section>
      <LumaSheet open={outer} onOpenChange={setOuter} title={qa("outerSheet")}>
        <Button onClick={() => setInner(true)}>{qa("innerSheet")}</Button>
        <LumaSheet open={inner} onOpenChange={setInner} title={qa("innerSheet")}>
          <Button onClick={() => setInner(false)}>{kit("close")}</Button>
        </LumaSheet>
      </LumaSheet>
    </main>
  );
}
