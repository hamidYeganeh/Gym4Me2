"use client";
import { ErrorNotice } from "@repo/ui/account";
import Link from "next/link";
import { useId, useRef } from "react";
import { Button } from "@repo/ui/kit/Button";
import { isActiveSurfaceElement } from "@repo/ui/lib/active-surface";
import {
  useSportsCommand,
  useSportsInvitations,
  type InvitationDto,
  type InvitationResultDto,
  type InvitationAnswerInput,
} from "@repo/api/sports";
import {
  CommandError,
  Empty,
  LumaPage,
  QueryState,
  Row,
  useLuma,
} from "./common";
import { LumaLoadMore } from "./load-more";

export function SportsInvitations() {
  const t = useLuma();
  const countId = useId();
  const query = useSportsInvitations();
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const nextPageFailed =
    query.isFetchNextPageError &&
    !!query.error &&
    (query.error.status === 0 || query.error.status >= 500);
  return (
    <LumaPage title={t("invitations")} back="/">
      <p className="luma-meta">{t("invitationNote")}</p>
      <QueryState
        query={{
          isPending: query.isPending,
          error: nextPageFailed ? null : query.error,
          refetch: query.refetch,
        }}
      >
        {items.map((i) => (
          <Invitation key={i.id} invitation={i} />
        ))}
        {!items.length && <Empty />}
        {nextPageFailed && <ErrorNotice error={query.error} />}
        {query.hasNextPage && (
          <LumaLoadMore
            loading={query.isFetchingNextPage}
            onLoad={async () => {
              const before = items.length;
              const result = await query.fetchNextPage();
              const next = result.isSuccess
                ? result.data?.pages.flatMap((page) => page.items)[before]
                : undefined;
              return next
                ? `sports-invitation-${next.id}`
                : result.isSuccess
                  ? countId
                  : undefined;
            }}
          >
            {query.isFetchingNextPage
              ? t("loading")
              : nextPageFailed
                ? t("retry")
                : t("loadMoreInvitations")}
          </LumaLoadMore>
        )}
        <p
          id={countId}
          tabIndex={-1}
          className="luma-meta focus-visible:outline-2 focus-visible:outline-ring"
          role="status"
        >
          {t("invitationListCount", { count: items.length })}
        </p>
      </QueryState>
    </LumaPage>
  );
}

function Invitation({ invitation: i }: { invitation: InvitationDto }) {
  const t = useLuma();
  const command = useSportsCommand<InvitationResultDto, InvitationAnswerInput>(
    `sports/community/invitations/${i.id}/answer`,
  );
  const key = useRef<{
    accept: boolean;
    revision: number;
    value: string;
  } | null>(null);
  const pending = useRef(false);
  const row = useRef<HTMLElement>(null);
  const answer = (accept: boolean) => {
    if (pending.current || i.status !== "invited" || (accept && !i.available))
      return;
    const origin = document.activeElement;
    const restoreFocus = !!origin && !!row.current?.contains(origin);
    pending.current = true;
    key.current =
      key.current?.accept === accept && key.current.revision === i.revision
        ? key.current
        : { accept, revision: i.revision, value: crypto.randomUUID() };
    command.mutate(
      { accept, revision: i.revision, idempotencyKey: key.current.value },
      {
        onSuccess: () =>
          requestAnimationFrame(() => {
            if (
              restoreFocus &&
              isActiveSurfaceElement(row.current) &&
              (document.activeElement === document.body ||
                document.activeElement === origin)
            )
              row.current?.focus();
          }),
        onSettled: () => {
          pending.current = false;
        },
      },
    );
  };
  return (
    <article
      ref={row}
      tabIndex={-1}
      id={`sports-invitation-${i.id}`}
      aria-label={i.title}
      aria-busy={command.isPending}
      className="luma-group mt-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
    >
      <Row
        title={i.title}
        state={i.status}
        meta={[i.clubName, i.branchName].filter(Boolean).join(" · ")}
        href={i.available ? `/services/detail?id=${i.serviceId}` : undefined}
      />
      {i.status === "invited" && (
        <div className="flex flex-wrap gap-3 pb-4">
          <Button
            type="button"
            className="min-h-12 flex-1"
            disabled={command.isPending || !i.available}
            aria-busy={command.isPending && command.variables?.accept === true}
            onClick={() => answer(true)}
          >
            {t("accept")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-12 flex-1"
            disabled={command.isPending}
            aria-busy={command.isPending && command.variables?.accept === false}
            onClick={() => answer(false)}
          >
            {t("decline")}
          </Button>
        </div>
      )}
      {!i.available && (
        <p className="luma-meta pb-3">{t("invitationServiceUnavailable")}</p>
      )}
      {i.status === "accepted" && i.available && (
        <Link
          className="luma-cta mb-3"
          href={`/services/detail?id=${i.serviceId}`}
        >
          {t("invitationContinue")}
        </Link>
      )}
      <CommandError error={command.error} />
    </article>
  );
}
