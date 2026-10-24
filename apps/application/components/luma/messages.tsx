"use client";
import { FilterSheet } from "@repo/ui/kit/BottomSheet";
import { useId } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@repo/i18n";
import { MessageCircle } from "lucide-react";
import { useSportsConversations } from "@repo/api/sports";
import { Empty, LumaPage, QueryState, Row, Segments, useLuma } from "./common";
import { LumaLoadMore } from "./load-more";

export function MessagesPage() {
  const t = useLuma();
  const countId = useId();
  const params = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const tab = params.get("view") === "archived" ? "archived" : "all";
  const query = useSportsConversations(tab === "archived");
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const nextPageFailed =
    query.isFetchNextPageError &&
    !!query.error &&
    (query.error.status === 0 || query.error.status >= 500);
  return (
    <LumaPage title={t("messages")} className="luma-messages-page">
      <FilterSheet count={tab === "archived" ? 1 : 0}>
        <Segments
          value={tab}
          onChange={(value) =>
            router.replace(
              value === "archived" ? "/messages?view=archived" : "/messages",
              { scroll: false },
            )
          }
          options={(["all", "archived"] as const).map((v) => ({
            value: v,
            label: t(v),
          }))}
        />
      </FilterSheet>
      <QueryState
        query={{
          isPending: query.isPending,
          error: nextPageFailed ? null : query.error,
          refetch: query.refetch,
        }}
      >
        {items.map((c) => (
          <article
            key={c.id}
            id={`conversation-${c.id}`}
            tabIndex={-1}
            aria-label={c.title}
            className="focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Row
              title={c.title}
              icon={
                <span className="luma-conversation-avatar" aria-hidden="true">
                  {c.title.trim().slice(0, 2)}
                </span>
              }
              href={`/messages/conversation?id=${c.id}`}
              meta={
                c.lastMessage ||
                (c.lastMessageHasImage
                  ? t("image")
                  : c.closed
                    ? t("closedChat")
                    : "")
              }
            >
              {c.unread > 0 && (
                <span
                  className="luma-pill"
                  aria-label={t("unreadMessageCount", { count: c.unread })}
                >
                  {new Intl.NumberFormat(locale).format(c.unread)}
                </span>
              )}
            </Row>
          </article>
        ))}
        {!items.length && <Empty icon={<MessageCircle />} />}
        {nextPageFailed && (
          <p role="alert" className="luma-error mt-4">
            {t("loadMoreConversationsError")}
          </p>
        )}
        {query.hasNextPage && (
          <LumaLoadMore
            loading={query.isFetchingNextPage}
            onLoad={async () => {
              const result = await query.fetchNextPage();
              const next = result.isSuccess
                ? result.data?.pages.flatMap((page) => page.items)[items.length]
                : undefined;
              return next
                ? `conversation-${next.id}`
                : result.isSuccess
                  ? countId
                  : undefined;
            }}
          >
            {query.isFetchingNextPage
              ? t("loading")
              : nextPageFailed
                ? t("retry")
                : t("loadMoreConversations")}
          </LumaLoadMore>
        )}
        <p
          id={countId}
          tabIndex={-1}
          className="luma-meta focus-visible:outline-2 focus-visible:outline-ring"
          role="status"
        >
          {t("conversationCount", { count: items.length })}
        </p>
      </QueryState>
    </LumaPage>
  );
}
