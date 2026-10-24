"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, ChevronRight, Dumbbell } from "lucide-react";
import { useLocale, useTranslations } from "@repo/i18n";
import { useTrainingQuery, type Exercise } from "@repo/api/profile";
import { Button } from "./kit/Button";
import { Input } from "./kit/Input";
import { BottomSheet } from "./kit/BottomSheet";
import { Loading, QueryError } from "./account/common";

/** The management library uses the same published movements as athlete plans. */
export function TrainingPage({
  title,
  description,
  back,
}: {
  title: string;
  description: string;
  back: string;
}) {
  const locale = useLocale(),
    t = useTranslations("Training");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Exercise | null>(null);
  const query = useTrainingQuery<Exercise[]>("profile/training/exercises");
  const name = (exercise: Exercise) =>
    locale === "fa" ? exercise.nameFa : exercise.nameEn;
  const items = (query.data ?? []).filter((exercise) =>
    `${exercise.nameFa} ${exercise.nameEn} ${exercise.equipment} ${exercise.tags.join(" ")}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase()),
  );
  return (
    <main className="gym-workspace movement-library">
      <header>
        <Button variant="ghost" asChild>
          <Link href="/">{back}</Link>
        </Button>
        <h1>{title}</h1>
      </header>
      <p className="movement-library-intro">{description}</p>
      <label className="movement-library-search">
        <Search size={18} aria-hidden="true" />
        <Input
          aria-label={t("searchExercise")}
          placeholder={t("searchExercise")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <QueryError error={query.error} retry={query.refetch} />
      {query.isPending ? (
        <Loading />
      ) : (
        <div className="movement-library-list">
          {items.map((exercise) => (
            <button
              key={exercise.id}
              type="button"
              onClick={() => setSelected(exercise)}
              aria-haspopup="dialog"
            >
              <Image
                src={exercise.illustration}
                width={64}
                height={72}
                alt=""
                unoptimized
              />
              <span>
                <strong>{name(exercise)}</strong>
                <small>{exercise.equipment}</small>
              </span>
              <ChevronRight className="rtl:rotate-180" size={18} />
            </button>
          ))}
          {!items.length && !query.error && (
            <p className="training-empty">
              <Dumbbell size={28} aria-hidden="true" />
              {t("noExerciseResults")}
            </p>
          )}
        </div>
      )}
      <BottomSheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected ? name(selected) : title}
      >
        {selected && (
          <div className="movement-library-detail">
            <Image
              src={selected.illustration}
              width={400}
              height={400}
              alt={name(selected)}
              unoptimized
            />
            <p>
              {locale === "fa"
                ? selected.instructionFa
                : selected.instructionEn}
            </p>
            <small>{selected.tags.join(" · ")}</small>
          </div>
        )}
      </BottomSheet>
    </main>
  );
}
