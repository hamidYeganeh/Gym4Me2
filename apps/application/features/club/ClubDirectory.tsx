"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import type { ClubSummary, PublicClub } from "./api";

import { ApiError } from "@repo/api/http";
import { useTranslations } from "@repo/i18n";
import { AnimatedButton } from "@repo/ui/kit/button";
import { ClubCard } from "@repo/ui/kit/club-card";

import { clubMediaUrl, getClub, listClubs } from "./api";
import { fromPublicClub } from "./clubs";
import ClubView from "./ClubView";

type Result =
  | { kind: "list"; clubs: ClubSummary[] }
  | { kind: "detail"; club: PublicClub }
  | { kind: "error"; missing: boolean };
export const DirectoryContent = (props: { id: string | null }) => {
  const { id } = props;
  const t = useTranslations("Club");
  const [result, setResult] = useState<Result>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    const load = async () => {
      try {
        if (id) {
          const club = await getClub(id, abort.signal);
          if (!abort.signal.aborted) setResult({ kind: "detail", club });
        } else {
          const clubs = await listClubs(abort.signal);
          if (!abort.signal.aborted) setResult({ kind: "list", clubs });
        }
      } catch (error) {
        if (!abort.signal.aborted)
          setResult({
            kind: "error",
            missing: error instanceof ApiError && (error.status === 400 || error.status === 404),
          });
      }
    };
    void load();
    return () => abort.abort();
  }, [id, attempt]);
  if (result?.kind === "detail") return <ClubView club={fromPublicClub(result.club)} />;
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-theme-4 p-theme-6">
      <Link className="underline" href={id ? "/clubs/" : "/"}>
        {t(id ? "allClubs" : "home")}
      </Link>
      {!result && <p role="status">{t("loading")}</p>}
      {result?.kind === "error" && (
        <>
          <p role="alert">{t(result.missing ? "unavailable" : "loadError")}</p>
          <AnimatedButton
            onClick={() => {
              setResult(undefined);
              setAttempt((value) => value + 1);
            }}
          >
            {t("retry")}
          </AnimatedButton>
        </>
      )}
      {result?.kind === "list" && (
        <>
          <h1>{t("clubs")}</h1>
          {!result.clubs.length && <p>{t("emptyDirectory")}</p>}
          <ul className="grid gap-theme-4">
            {result.clubs.map(({ id, title, address, cover, coverHash }) => {
              const image = coverHash ? clubMediaUrl(id, coverHash) : cover;
              const href =
                process.env.NEXT_PUBLIC_CAPACITOR_EXPORT === "1" ?
                  `/clubs/?id=${encodeURIComponent(id)}`
                : `/clubs/${encodeURIComponent(id)}/`;
              return (
                <li key={id}>
                  <ClubCard
                    variant="horizontal"
                    href={href}
                    name={title}
                    address={address}
                    image={image ? { src: image, alt: title } : undefined}
                  />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
};
export const ClubDirectory = () => {
  const id = useSearchParams().get("id");
  return <DirectoryContent key={id ?? "directory"} id={id} />;
};
