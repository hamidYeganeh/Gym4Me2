"use client";
import Link from "next/link";
import { useId, useRef } from "react";
import { isActiveSurfaceElement } from "@repo/ui/lib/active-surface";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@repo/i18n";
import { Bell } from "lucide-react";
import {
  useSportsNotifications,
  useSportsCommand,
  type NotificationDto,
  type NotificationReadDto,
} from "@repo/api/sports";
import {
  LumaPage,
  Segments,
  QueryState,
  Row,
  Empty,
  CommandError,
  stamp,
  useLuma,
} from "./common";
import { LumaLoadMore } from "./load-more";

export function NotificationsPage() {
  const t = useLuma(),
    params = useSearchParams(),
    router = useRouter();
  const view = params.get("view") === "unread" ? "unread" : "all";
  const countId = useId();
  const query = useSportsNotifications(view),
    list = useRef<HTMLDivElement>(null);
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const nextPageFailed =
    query.isFetchNextPageError &&
    !!query.error &&
    (query.error.status === 0 || query.error.status >= 500);
  return (
    <LumaPage title={t("notifications")} back="/">
      <Link className="luma-shortcut" href="/notifications/preferences">
        {t("notifyPreferences")}
      </Link>
      <Segments
        value={view}
        options={[
          { value: "all", label: t("all") },
          { value: "unread", label: t("unreadNotifications") },
        ]}
        onChange={(value) =>
          router.replace(
            value === "unread"
              ? "/notifications?view=unread"
              : "/notifications",
            { scroll: false },
          )
        }
      />
      <div
        ref={list}
        role="region"
        tabIndex={-1}
        aria-label={t("notifications")}
        className="focus-visible:outline-2 focus-visible:outline-ring"
      >
        <QueryState
          query={{
            isPending: query.isPending,
            error: nextPageFailed ? null : query.error,
            refetch: query.refetch,
          }}
        >
          {items.map((item) => (
            <Notification
              key={item.id}
              item={item}
              onRead={(origin) => {
                if (view === "unread")
                  requestAnimationFrame(() => {
                    if (
                      isActiveSurfaceElement(list.current) &&
                      (document.activeElement === document.body ||
                        document.activeElement === origin)
                    )
                      list.current?.focus();
                  });
              }}
            />
          ))}
          {!items.length && <Empty />}
          {nextPageFailed && (
            <p role="alert" className="luma-error mt-4">
              {t("loadMoreNotificationsError")}
            </p>
          )}
          {query.hasNextPage && (
            <LumaLoadMore
              loading={query.isFetchingNextPage}
              onLoad={async () => {
                const result = await query.fetchNextPage();
                const next = result.isSuccess
                  ? result.data?.pages.flatMap((page) => page.items)[
                      items.length
                    ]
                  : undefined;
                return next
                  ? `notification-${next.id}`
                  : result.isSuccess
                    ? countId
                    : undefined;
              }}
            >
              {query.isFetchingNextPage
                ? t("loading")
                : nextPageFailed
                  ? t("retry")
                  : t("loadMoreNotifications")}
            </LumaLoadMore>
          )}
          <p
            id={countId}
            tabIndex={-1}
            className="luma-meta focus-visible:outline-2 focus-visible:outline-ring"
            role="status"
          >
            {t("notificationCount", { count: items.length })}
          </p>
        </QueryState>
      </div>
    </LumaPage>
  );
}
function Notification({
  item: n,
  onRead,
}: {
  item: NotificationDto;
  onRead(origin: Element | null): void;
}) {
  const t = useLuma(),
    locale = useLocale();
  const mark = useSportsCommand<NotificationReadDto, Record<string, never>>(
    `sports/community/notifications/${n.id}/read`,
  );
  const pending = useRef(false);
  return (
    <article
      id={`notification-${n.id}`}
      tabIndex={-1}
      aria-label={n.title}
      aria-busy={mark.isPending}
      className="pb-2 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <Row
        title={n.title}
        meta={[n.body, stamp(n.createdAt, locale)].filter(Boolean).join(" · ")}
        href={n.href}
        icon={<Bell size={24} aria-hidden="true" />}
      >
        <span className="luma-pill">
          {t(n.readAt ? "notificationRead" : "unreadNotification")}
        </span>
      </Row>
      {!n.readAt ? (
        <button
          type="button"
          className="luma-shortcut min-h-11"
          disabled={mark.isPending}
          aria-busy={mark.isPending}
          aria-label={t("markNotificationRead", {
            title: [n.title, n.body].filter(Boolean).join(" · "),
          })}
          onClick={() => {
            if (pending.current) return;
            const origin = document.activeElement;
            pending.current = true;
            mark.mutate(
              {},
              {
                onSuccess: () => onRead(origin),
                onSettled: () => {
                  pending.current = false;
                },
              },
            );
          }}
        >
          {mark.isPending ? t("saving") : t("markAsRead")}
        </button>
      ) : null}
      <CommandError error={mark.error} />
    </article>
  );
}
