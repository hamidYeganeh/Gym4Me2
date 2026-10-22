"use client";
import { FilterSheet } from "@repo/ui/kit/BottomSheet";
import { AuthEntryButton } from "@repo/ui/account";
import { useAuthRecovery } from "@repo/ui/hooks/use-auth-recovery";
import { useDeferredValue, useId, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@repo/i18n";
import { useAccount } from "@repo/api/profile";
import {
  useSportsCalendars,
  useCalendarServices,
  useSportsQuery,
  useSportsCommand,
  type CalendarDetailDto,
  type CalendarFollowDto,
  type CalendarFollowInput,
} from "@repo/api/sports";
import {
  CommandError,
  Empty,
  Field,
  LumaPage,
  Price,
  QueryState,
  Row,
  Section,
  Segments,
  stamp,
  useLuma,
} from "./common";
import { LumaLoadMore } from "./load-more";

export function CalendarsPage() {
  const t = useLuma(),
    params = useSearchParams(),
    router = useRouter();
  const view = params.get("view") === "following" ? "following" : "all";
  const [search, setSearch] = useState("");
  const query = useSportsCalendars(view, useDeferredValue(search));
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const countId = useId();
  const nextPageFailed =
    query.isFetchNextPageError &&
    items.length > 0 &&
    ![401, 403].includes(query.error?.status ?? 0);
  return (
    <LumaPage title={t("calendars")} back="/">
      <FilterSheet count={view === "all" ? 0 : 1}>
        <Segments
          value={view}
          options={[
            { value: "all", label: t("all") },
            { value: "following", label: t("yourCalendars") },
          ]}
          onChange={(value) =>
            router.replace(
              value === "following"
                ? "/calendars?view=following"
                : "/calendars",
              { scroll: false },
            )
          }
        />
      </FilterSheet>
      <Field label={t("search")}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={100}
        />
      </Field>
      <QueryState
        query={{
          isPending: query.isPending,
          error: nextPageFailed ? null : query.error,
          refetch: query.refetch,
        }}
      >
        {items.map((c) => (
          <article tabIndex={-1} id={`calendar-${c.id}`} key={c.id}>
            <Row
              title={c.title}
              meta={`${c.clubName} · ${c.branchName}`}
              href={`/calendars/detail?id=${c.id}`}
            />
          </article>
        ))}
        {!items.length && <Empty />}
        {nextPageFailed && (
          <p role="alert" className="luma-error">
            {t("loadError")}
          </p>
        )}
        {query.hasNextPage && (
          <LumaLoadMore
            loading={query.isFetchingNextPage}
            onLoad={async () => {
              const result = await query.fetchNextPage();
              const next = result.isSuccess
                ? result.data?.pages.flatMap((p) => p.items)[items.length]
                : undefined;
              return next
                ? `calendar-${next.id}`
                : result.isSuccess
                  ? countId
                  : undefined;
            }}
          >
            {query.isFetchingNextPage
              ? t("loading")
              : nextPageFailed
                ? t("retry")
                : t("loadMoreCalendars")}
          </LumaLoadMore>
        )}
        <p id={countId} tabIndex={-1} className="luma-meta" role="status">
          {t("calendarCount", { count: items.length })}
        </p>
      </QueryState>
    </LumaPage>
  );
}
export function CalendarDetail() {
  const t = useLuma(),
    id = useSearchParams().get("id");
  const query = useSportsQuery<CalendarDetailDto>(
    `sports/calendars/${id}`,
    undefined,
    Boolean(id),
  );
  if (!id)
    return (
      <LumaPage title={t("calendars")} back="/calendars">
        <Empty />
      </LumaPage>
    );
  return (
    <LumaPage title={query.data?.title ?? t("calendars")} back="/calendars">
      <QueryState query={query}>
        {query.data && (
          <>
            <p className="luma-meta">
              {query.data.clubName} · {query.data.branchName}
            </p>
            {query.data.description && (
              <p className="my-4 whitespace-pre-wrap break-words">
                {query.data.description}
              </p>
            )}
            <CalendarFollow id={id} />
            <CalendarServices calendar={query.data} />
          </>
        )}
      </QueryState>
    </LumaPage>
  );
}
function CalendarFollow({ id }: { id: string }) {
  const t = useLuma(),
    account = useAccount();
  const query = useSportsQuery<CalendarFollowDto>(
    `sports/community/calendars/${id}/follow`,
    undefined,
    Boolean(account.data),
  );
  const command = useSportsCommand<CalendarFollowDto, CalendarFollowInput>(
    `sports/community/calendars/${id}/follow`,
  );
  const recovery = useAuthRecovery(account, `/calendars/detail?id=${id}`);
  if (account.isPending && recovery?.kind !== "signIn")
    return (
      <p className="luma-meta" role="status">
        {t("loading")}
      </p>
    );
  if (account.error && account.error.status !== 401)
    return (
      <QueryState query={account}>
        <Empty />
      </QueryState>
    );
  if (!account.data)
    return (
      <AuthEntryButton returnTo={`/calendars/detail?id=${id}`}>
        {t("signInToFollow")}
      </AuthEntryButton>
    );
  return (
    <QueryState query={query}>
      <button
        className="luma-cta"
        aria-pressed={query.data?.following ?? false}
        disabled={query.isPending || command.isPending}
        onClick={() => command.mutate({ following: !query.data?.following })}
      >
        {query.data?.following ? t("unfollow") : t("follow")}
      </button>
      <CommandError error={command.error} />
      <p role="status" className="luma-meta">
        {command.isSuccess
          ? command.data.following
            ? t("calendarFollowed")
            : t("calendarUnfollowed")
          : ""}
      </p>
    </QueryState>
  );
}
function CalendarServices({ calendar }: { calendar: CalendarDetailDto }) {
  const t = useLuma(),
    locale = useLocale(),
    query = useCalendarServices(calendar);
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const countId = useId();
  const nextPageFailed =
    query.isFetchNextPageError &&
    items.length > 0 &&
    ![401, 403].includes(query.error?.status ?? 0);
  return (
    <Section title={t("services")}>
      <QueryState
        query={{
          isPending: query.isPending,
          error: nextPageFailed ? null : query.error,
          refetch: query.refetch,
        }}
      >
        {items.map((s) => (
          <article tabIndex={-1} id={`calendar-service-${s.id}`} key={s.id}>
            <Row
              title={s.title}
              meta={[stamp(s.nextStartAt, locale), s.level, s.coachName]
                .filter(Boolean)
                .join(" · ")}
              href={`/services/detail?id=${s.id}`}
            >
              <span className="luma-meta">
                <Price value={s.amountMinor} />
              </span>
            </Row>
          </article>
        ))}
        {!items.length && <Empty />}
        {nextPageFailed && (
          <p role="alert" className="luma-error">
            {t("loadError")}
          </p>
        )}
        {query.hasNextPage && (
          <LumaLoadMore
            loading={query.isFetchingNextPage}
            onLoad={async () => {
              const result = await query.fetchNextPage();
              const next = result.isSuccess
                ? result.data?.pages.flatMap((p) => p.items)[items.length]
                : undefined;
              return next
                ? `calendar-service-${next.id}`
                : result.isSuccess
                  ? countId
                  : undefined;
            }}
          >
            {query.isFetchingNextPage
              ? t("loading")
              : nextPageFailed
                ? t("retry")
                : t("loadMoreCalendarServices")}
          </LumaLoadMore>
        )}
        <p id={countId} tabIndex={-1} role="status" className="luma-meta">
          {t("calendarServiceCount", { count: items.length })}
        </p>
      </QueryState>
    </Section>
  );
}
