"use client";
import { useBranches, useOrganizations } from "@repo/api/business";
import { useSportsHostConversations } from "@repo/api/sports";
import { useLocale, useTranslations } from "@repo/i18n";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";
import { Loading } from "../account/common";
import { ChatIcon as MessageCircle } from "../icons";
import { FilterSheet } from "../kit/BottomSheet";
import { Button } from "../kit/Button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../kit/Empty";
import { Field, FieldGroup, FieldLabel } from "../kit/Field";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { ToggleGroup, ToggleGroupItem } from "../kit/ToggleGroup";
import { activeSurfaceTarget } from "../lib/active-surface";
import "./host-conversations.css";
import { QueryError } from "./query-error";
import { SportsFrame } from "./workspace";

export function SportsHostConversations() {
  const t = useTranslations("Luma"),
    locale = useLocale(),
    params = useSearchParams(),
    router = useRouter();
  const organizations = useOrganizations(),
    organizationId =
      params.get("organizationId") || organizations.data?.[0]?.id;
  const branches = useBranches(organizationId),
    branchId = params.get("branchId") || branches.data?.[0]?.id;
  const archived = params.get("view") === "archived",
    query = useSportsHostConversations(organizationId, branchId, archived);
  const items = query.data?.pages.flatMap((page) => page.items) ?? [],
    loadingMore = useRef(false);
  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(`/messages${next.size ? `?${next}` : ""}`, {
      scroll: false,
    });
  };
  const error = organizations.error ?? branches.error ?? query.error;
  return (
    <SportsFrame title={t("messages")}>
      <div className="sports-host-conversations">
        <p className="text-muted-foreground mb-6">
          {t("hostConversationHint")}
        </p>
        <FilterSheet count={archived ? 1 : 0}>
          <FieldGroup className="grid grid-cols-2 gap-3 mb-6">
            <Field>
              <FieldLabel htmlFor="host-chat-organization">
                {t("organization")}
              </FieldLabel>
              <NativeSelect
                id="host-chat-organization"
                value={organizationId ?? ""}
                disabled={
                  organizations.isPending || !organizations.data?.length
                }
                onChange={(event) =>
                  update({
                    organizationId: event.target.value,
                    branchId: undefined,
                  })
                }
              >
                {organizations.data?.map((o) => (
                  <NativeSelectOption key={o.id} value={o.id}>
                    {o.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="host-chat-branch">{t("branch")}</FieldLabel>
              <NativeSelect
                id="host-chat-branch"
                value={branchId ?? ""}
                disabled={branches.isPending || !branches.data?.length}
                onChange={(event) =>
                  update({ organizationId, branchId: event.target.value })
                }
              >
                {branches.data?.map((b) => (
                  <NativeSelectOption key={b.id} value={b.id}>
                    {b.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          </FieldGroup>
          <ToggleGroup
            type="single"
            value={archived ? "archived" : "all"}
            aria-label={t("messages")}
            onValueChange={(value) => {
              if (value)
                update({ view: value === "archived" ? value : undefined });
            }}
            className="mb-6"
          >
            <ToggleGroupItem value="all">{t("inbox")}</ToggleGroupItem>
            <ToggleGroupItem value="archived">{t("archived")}</ToggleGroupItem>
          </ToggleGroup>
        </FilterSheet>
        <QueryError
          error={error}
          retry={() => {
            const requests: Promise<unknown>[] = [organizations.refetch()];
            if (organizationId) requests.push(branches.refetch());
            if (organizationId && branchId) requests.push(query.refetch());
            return Promise.allSettled(requests);
          }}
        />
        {organizations.isPending ||
        (organizationId && branches.isPending) ||
        (branchId && query.isPending) ? (
          <Loading />
        ) : (
          !error && (
            <>
              <section className="sports-host-inbox" aria-label={t("messages")}>
                {items.map((conversation) => (
                  <article
                    key={conversation.id}
                    id={`host-conversation-${conversation.id}`}
                    tabIndex={-1}
                  >
                    <Link
                      href={`/messages/${conversation.id}`}
                      className="sports-host-inbox-row"
                    >
                      <span className="sports-host-avatar">
                        <MessageCircle aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="font-medium block break-words">
                          {conversation.title}
                        </span>
                        <span className="text-sm text-muted-foreground block truncate">
                          {conversation.lastMessage ||
                            (conversation.lastMessageHasImage
                              ? t("image")
                              : conversation.closed
                                ? t("closedChat")
                                : t("chatNoMessages"))}
                        </span>
                      </span>
                      {conversation.unread > 0 && (
                        <span
                          className="sports-host-unread"
                          aria-label={t("unreadMessageCount", {
                            count: conversation.unread,
                          })}
                        >
                          {new Intl.NumberFormat(locale).format(
                            conversation.unread,
                          )}
                        </span>
                      )}
                    </Link>
                  </article>
                ))}
                {!items.length && (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <MessageCircle />
                      </EmptyMedia>
                      <EmptyTitle>{t("messages")}</EmptyTitle>
                      <EmptyDescription>
                        {t("hostConversationEmpty")}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </section>
              <div className="flex flex-wrap justify-between items-center gap-4 mt-5">
                <p role="status" className="text-sm text-muted-foreground">
                  {t("conversationCount", { count: items.length })}
                </p>
                {query.hasNextPage && (
                  <Button
                    variant="outline"
                    disabled={query.isFetchingNextPage}
                    onClick={() => {
                      if (loadingMore.current) return;
                      loadingMore.current = true;
                      void query
                        .fetchNextPage()
                        .then((result) => {
                          const next = result.data?.pages.flatMap(
                            (page) => page.items,
                          )[items.length];
                          if (next)
                            requestAnimationFrame(() =>
                              activeSurfaceTarget(
                                `host-conversation-${next.id}`,
                              )?.focus(),
                            );
                        })
                        .finally(() => {
                          loadingMore.current = false;
                        });
                    }}
                  >
                    {query.isFetchingNextPage
                      ? t("loading")
                      : t("loadMoreConversations")}
                  </Button>
                )}
              </div>
            </>
          )
        )}
      </div>
    </SportsFrame>
  );
}
