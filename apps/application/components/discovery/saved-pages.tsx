"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowDownWideNarrow, Bookmark, Plus, UserRound } from "lucide-react";
import { useLocale, useTranslations } from "@repo/i18n";
import { useAccount } from "@repo/api/profile";
import type { ClubDetailData } from "@repo/ui/kit/ClubDetail";
import type { CoachSummary } from "@repo/ui/kit/CoachCard";
import { Button } from "@repo/ui/kit/Button";
import { Avatar, AvatarFallback } from "@repo/ui/kit/Avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@repo/ui/kit/DropdownMenu";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@repo/ui/kit/Empty";
import { Skeleton } from "@repo/ui/kit/Skeleton";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/kit/Tabs";
import { useCatalogClubs } from "./use-catalog";
import { useSavedClub, useSavedClubIds } from "./use-saved-club";
import { useSavedCoach, useSavedCoachIds } from "./use-saved-coach";
import { CatalogState } from "./catalog-state";
import { CatalogPagination } from "./catalog-pagination";
import { clubIds } from "../../lib/clubs";
import { getCoaches } from "../../lib/coaches";

function SavedTile({
  href,
  name,
  photo,
  description,
  unsave,
}: {
  href: string;
  name: string;
  photo: string;
  description: string;
  unsave: () => void;
}) {
  const t = useTranslations("SavedPages");
  return (
    <li className="relative min-w-0">
      <Link
        href={href}
        className="flex flex-col gap-2.5 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-muted">
          <Image
            src={photo}
            alt=""
            fill
            sizes="(max-width: 576px) 45vw, 250px"
            className="object-cover"
            unoptimized
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="truncate text-sm font-semibold sm:text-base">
            {name}
          </h2>
          <p className="truncate text-xs text-muted-foreground">
            {description}
          </p>
        </div>
      </Link>
      <Button
        variant="image"
        size="icon"
        className="absolute end-2 top-2"
        aria-label={t("remove", { name })}
        onClick={unsave}
      >
        <Bookmark fill="currentColor" />
      </Button>
    </li>
  );
}
function SavedClubTile({ club }: { club: ClubDetailData }) {
  const [, setSaved] = useSavedClub(club.id);
  return (
    <SavedTile
      href={club.href ?? `/discovery/clubs/${club.id}`}
      name={club.name}
      photo={club.photos[0].src}
      description={club.address || club.category}
      unsave={() => setSaved(false)}
    />
  );
}
function SavedCoachTile({ coach }: { coach: CoachSummary }) {
  const [, setSaved] = useSavedCoach(coach.id);
  return (
    <SavedTile
      href={`/discovery/coaches/${coach.id}`}
      name={coach.name}
      photo={coach.photo?.src ?? "/images/clubs/strength.png"}
      description={coach.specialty}
      unsave={() => setSaved(false)}
    />
  );
}
function SavedEmpty() {
  const t = useTranslations("SavedPages");
  return (
    <Empty className="min-h-80">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Bookmark />
        </EmptyMedia>
        <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
        <EmptyDescription>{t("emptyHint")}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link href="/discovery">{t("discover")}</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
function SavedShell({
  kind,
  sort,
  options,
  onSort,
  children,
}: {
  kind: "clubs" | "coaches";
  sort: string;
  options: { value: string; label: string }[];
  onSort: (value: string) => void;
  children: ReactNode;
}) {
  const t = useTranslations("SavedPages");
  const account = useAccount();
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 bg-background px-5 pt-[calc(2rem+var(--app-safe-top,0px))] pb-[calc(7rem+var(--app-safe-bottom,0px))] sm:px-6">
      <header className="flex items-center gap-2">
        <h1 className="min-w-0 flex-1 text-3xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-lg" aria-label={t("sort")}>
              <ArrowDownWideNarrow />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            <DropdownMenuGroup>
              <DropdownMenuRadioGroup value={sort} onValueChange={onSort}>
                {options.map((option) => (
                  <DropdownMenuRadioItem
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon-lg" asChild>
          <Link href="/profile" aria-label={t("profile")}>
            <Avatar>
              <AvatarFallback>
                {account.data?.displayName?.slice(0, 2) || <UserRound />}
              </AvatarFallback>
            </Avatar>
          </Link>
        </Button>
      </header>
      <Tabs value={kind}>
        <TabsList className="w-full">
          <TabsTrigger value="clubs" asChild>
            <Link href="/saved">{t("clubs")}</Link>
          </TabsTrigger>
          <TabsTrigger value="coaches" asChild>
            <Link href="/saved/coaches">{t("coaches")}</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {children}
      <div className="pointer-events-none fixed inset-x-5 bottom-[calc(1.5rem+var(--app-safe-bottom,0px))] mx-auto flex max-w-[calc(36rem-2.5rem)] justify-end">
        <Button
          size="icon-lg"
          asChild
          className="pointer-events-auto size-14 rounded-2xl shadow-lg"
        >
          <Link href="/discovery" aria-label={t("add")}>
            <Plus />
          </Link>
        </Button>
      </div>
    </main>
  );
}
export function SavedClubsPage() {
  const t = useTranslations("SavedPages");
  const account = useAccount();
  const ids = useSavedClubIds();
  const [sort, setSort] = useState<"recent" | "priceLow" | "priceHigh">(
    "recent",
  );
  const [page, setPage] = useState(1);
  const query = useCatalogClubs(
    { page, sort, ...(sort !== "recent" ? { unit: "visit" as const } : {}) },
    Boolean(account.data),
    account.data ? undefined : ids,
  );
  const error =
    account.error && account.error.status !== 401 ? account.error : query.error;
  return (
    <SavedShell
      kind="clubs"
      sort={sort}
      options={[
        { value: "recent", label: t("recent") },
        { value: "priceLow", label: t("priceLow") },
        { value: "priceHigh", label: t("priceHigh") },
      ]}
      onSort={(value) => {
        if (
          value === "recent" ||
          value === "priceLow" ||
          value === "priceHigh"
        ) {
          setSort(value);
          setPage(1);
        }
      }}
    >
      {account.isPending || query.isPending ? (
        <ul
          aria-busy="true"
          aria-label={t("loading")}
          className="grid grid-cols-2 gap-4"
        >
          {[0, 1].map((index) => (
            <li key={index} className="flex flex-col gap-3">
              <Skeleton className="aspect-[2/3] rounded-2xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </li>
          ))}
        </ul>
      ) : error ? (
        <CatalogState
          retry={() => {
            void account.refetch();
            void query.refetch();
          }}
        />
      ) : query.clubs.length ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6">
          {query.clubs.map((club) => (
            <SavedClubTile key={club.id} club={club} />
          ))}
        </ul>
      ) : (
        <SavedEmpty />
      )}
      <CatalogPagination
        page={page}
        onChange={setPage}
        next={query.clubs.length === 25}
        busy={query.isFetching}
      />
    </SavedShell>
  );
}
export function SavedCoachesPage() {
  const t = useTranslations("SavedPages");
  const locale = useLocale();
  const all = useMemo(
    () => clubIds.flatMap((id) => getCoaches(locale, id)),
    [locale],
  );
  const savedIds = useSavedCoachIds(all.map((coach) => coach.id));
  const [sort, setSort] = useState("name");
  const coaches = all
    .filter((coach) => savedIds.includes(coach.id))
    .sort((a, b) =>
      sort === "rating"
        ? b.rating - a.rating || a.name.localeCompare(b.name, locale)
        : sort === "experience"
          ? b.yearsOfExperience - a.yearsOfExperience ||
            a.name.localeCompare(b.name, locale)
          : a.name.localeCompare(b.name, locale),
    );
  return (
    <SavedShell
      kind="coaches"
      sort={sort}
      options={[
        { value: "name", label: t("alphabetical") },
        { value: "rating", label: t("rating") },
        { value: "experience", label: t("experience") },
      ]}
      onSort={setSort}
    >
      {coaches.length ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6">
          {coaches.map((coach) => (
            <SavedCoachTile key={coach.id} coach={coach} />
          ))}
        </ul>
      ) : (
        <SavedEmpty />
      )}
    </SavedShell>
  );
}
