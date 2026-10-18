"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowRight,
  MessageCircle,
  Paperclip,
  Send,
  Users,
} from "lucide-react";
import { useLocale, useTranslations } from "@repo/i18n";
import { useAccount } from "@repo/api/profile";
import { useApiForeground } from "@repo/api/provider";
import {
  useSportsConversation,
  useSportsCommand,
  type ConversationPreferencesInput,
  type MessageDto,
} from "@repo/api/sports";
import { SportsFrame } from "./workspace";
import { HostConversationState } from "./host-conversation-state";
import { HostSheet } from "./host-sheet";
import { QueryError } from "./query-error";
import {
  activeSurfaceTarget,
  isActiveSurfaceElement,
} from "../lib/active-surface";
import { Loading } from "../account/common";
import { Button } from "../kit/Button";
import { Field, FieldGroup, FieldLabel } from "../kit/Field";
import { Textarea } from "../kit/Textarea";
import { Empty, EmptyHeader, EmptyDescription, EmptyMedia } from "../kit/Empty";
import "./host-conversations.css";

export function SportsHostConversation({ id }: { id: string }) {
  const t = useTranslations("Luma"),
    locale = useLocale(),
    messageId = useId();
  const query = useSportsConversation(id, true),
    me = useAccount(),
    foreground = useApiForeground();
  const conversation = query.data?.pages[0]?.conversation;
  const messages = [...(query.data?.pages ?? [])]
    .reverse()
    .flatMap((page) => page.messages);
  const [body, setBody] = useState(""),
    [image, setImage] = useState<File>();
  const [imageError, setImageError] = useState(""),
    [membersOpen, setMembersOpen] = useState(false),
    [moderating, setModerating] = useState(false);
  const [reportTarget, setReportTarget] = useState<MessageDto | null>(null),
    [notice, setNotice] = useState("");
  const key = useRef<string | null>(null),
    fileInput = useRef<HTMLInputElement>(null),
    textarea = useRef<HTMLTextAreaElement>(null);
  const tail = useRef<HTMLDivElement>(null),
    nearTail = useRef(true),
    acknowledged = useRef<string | null>(null);
  const send = useSportsCommand(
    `sports/community/conversations/${id}/messages`,
  );
  const read = useSportsCommand<{ ok: boolean }, ConversationPreferencesInput>(
    `sports/community/conversations/${id}/preferences`,
  );
  const archive = useSportsCommand<
    { ok: boolean },
    ConversationPreferencesInput
  >(`sports/community/conversations/${id}/preferences`);
  const last = messages.at(-1)?.id,
    readCommand = read.mutate,
    modal = membersOpen || moderating || Boolean(reportTarget);
  useEffect(() => {
    if (
      last &&
      foreground &&
      nearTail.current &&
      !modal &&
      isActiveSurfaceElement(tail.current?.parentElement ?? null)
    )
      tail.current?.scrollIntoView({ block: "nearest" });
  }, [last, foreground, modal]);
  useEffect(() => {
    if (!last || !tail.current || !foreground || modal || query.isError) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // The tail is intentionally aria-hidden; check its conversation surface.
        nearTail.current = Boolean(
          entry?.isIntersecting &&
          isActiveSurfaceElement(entry.target.parentElement),
        );
        if (!nearTail.current || acknowledged.current === last) return;
        acknowledged.current = last;
        readCommand(
          { readMessageId: last },
          {
            onError: () => {
              if (acknowledged.current === last) acknowledged.current = null;
            },
          },
        );
      },
      // Viewport root also accounts for the nested chat scroller's clipping.
    );
    observer.observe(tail.current);
    return () => observer.disconnect();
  }, [last, foreground, modal, query.isError, readCommand]);
  const parent = conversation
    ? `/messages?${new URLSearchParams({ organizationId: conversation.organizationId, branchId: conversation.branchId, ...(conversation.archived ? { view: "archived" } : {}) })}`
    : "/messages";
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Tehran",
    }).format(new Date(value));
  return (
    <SportsFrame
      title={conversation?.title ?? t("messages")}
      className="sports-host-conversation-page"
    >
      <div className="sports-host-conversations">
        <Button asChild variant="outline" className="mb-5">
          <Link href={parent}>
            <ArrowRight data-icon="inline-start" className="ltr:rotate-180" />
            {t("backToConversations")}
          </Link>
        </Button>
        <QueryError error={query.error} retry={() => query.refetch()} />
        {query.isPending ? (
          <Loading />
        ) : (
          conversation &&
          !query.isError && (
            <>
              <div className="sports-host-chat-toolbar">
                <span className="text-sm text-muted-foreground">
                  {conversation.closed
                    ? t("closedChat")
                    : t("hostConversationHint")}
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setMembersOpen(true)}
                  >
                    <Users data-icon="inline-start" />
                    {t("members")} ·{" "}
                    {new Intl.NumberFormat(locale).format(
                      conversation.members?.length ?? 0,
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={archive.isPending}
                    onClick={() =>
                      archive.mutate({ archived: !conversation.archived })
                    }
                  >
                    {conversation.archived ? t("unarchive") : t("archive")}
                  </Button>
                  <HostConversationState
                    conversation={conversation}
                    onModalChange={setModerating}
                    reload={async () => {
                      const result = await query.refetch();
                      return result.error
                        ? null
                        : (result.data?.pages[0]?.conversation ?? null);
                    }}
                  />
                </div>
              </div>
              <QueryError error={archive.error} />
              <div className="sports-host-chat-card">
                <div
                  className="sports-host-chat-scroll"
                  role="region"
                  aria-label={t("messages")}
                  tabIndex={0}
                >
                  {query.hasNextPage && (
                    <Button
                      variant="outline"
                      disabled={query.isFetchingNextPage}
                      onClick={() => {
                        const anchor = messages[0]?.id;
                        void query.fetchNextPage().then(() => {
                          if (anchor)
                            requestAnimationFrame(() =>
                              activeSurfaceTarget(
                                `host-message-${anchor}`,
                              )?.scrollIntoView({ block: "start" }),
                            );
                        });
                      }}
                    >
                      {t("loadOlder")}
                    </Button>
                  )}
                  <div className="sports-host-chat-log">
                    {messages.map((message) => (
                      <article
                        id={`host-message-${message.id}`}
                        className="sports-host-chat-bubble"
                        data-own={message.senderId === me.data?.id}
                        key={message.id}
                      >
                        <p className="text-xs font-medium mb-2">
                          {message.displayName || t("account")}
                        </p>
                        {message.imageUrl && (
                          <Image
                            unoptimized
                            width={800}
                            height={800}
                            src={message.imageUrl}
                            alt={t("image")}
                            className="max-h-80 w-auto rounded-lg mb-3"
                          />
                        )}
                        {message.body && (
                          <p className="whitespace-pre-wrap break-words">
                            {message.body}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <time dateTime={message.createdAt}>
                            {date(message.createdAt)}
                          </time>
                          {message.senderId === me.data?.id ? (
                            <span>
                              {message.readByCount > 0
                                ? t("messageRead")
                                : t("messageSent")}
                            </span>
                          ) : (
                            <Button
                              variant="ghost"
                              onClick={() => setReportTarget(message)}
                            >
                              {t("reportMessage")}
                            </Button>
                          )}
                        </div>
                      </article>
                    ))}
                    {!messages.length && (
                      <Empty>
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <MessageCircle />
                          </EmptyMedia>
                          <EmptyDescription>
                            {t("chatNoMessages")}
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    )}
                    <div ref={tail} className="h-px" aria-hidden="true" />
                  </div>
                </div>
                {conversation.closed ? (
                  <p
                    className="p-5 text-sm text-muted-foreground"
                    role="status"
                  >
                    {t("closedChat")}
                  </p>
                ) : (
                  <form
                    className="sports-host-chat-compose"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (send.isPending || (!body.trim() && !image)) return;
                      key.current ??= crypto.randomUUID();
                      const payload = new FormData();
                      payload.set("body", body);
                      payload.set("idempotencyKey", key.current);
                      if (image) payload.set("file", image);
                      send.mutate(payload, {
                        onSuccess: () => {
                          setBody("");
                          setImage(undefined);
                          key.current = null;
                          setImageError("");
                          if (fileInput.current) fileInput.current.value = "";
                          setNotice(t("messageSent"));
                          requestAnimationFrame(() => {
                            if (isActiveSurfaceElement(textarea.current))
                              textarea.current?.focus();
                          });
                        },
                      });
                    }}
                  >
                    <FieldGroup>
                      <Field data-disabled={send.isPending}>
                        <FieldLabel htmlFor={messageId}>
                          {t("message")}
                        </FieldLabel>
                        <Textarea
                          id={messageId}
                          ref={textarea}
                          rows={2}
                          value={body}
                          maxLength={5000}
                          disabled={send.isPending}
                          placeholder={t("message")}
                          onChange={(event) => {
                            setBody(event.target.value);
                            key.current = null;
                            setNotice("");
                          }}
                        />
                      </Field>
                      <div className="flex items-center justify-between gap-3">
                        <Button
                          variant="outline"
                          type="button"
                          disabled={send.isPending}
                          onClick={() => fileInput.current?.click()}
                        >
                          <Paperclip data-icon="inline-start" />
                          {t("image")}
                        </Button>
                        <Button
                          type="submit"
                          disabled={send.isPending || (!body.trim() && !image)}
                        >
                          <Send
                            data-icon="inline-start"
                            className="rtl:rotate-180"
                          />
                          {send.isPending ? t("sendingMessage") : t("send")}
                        </Button>
                      </div>
                      <input
                        hidden
                        ref={fileInput}
                        type="file"
                        aria-label={t("image")}
                        accept="image/jpeg,image/png,image/webp"
                        disabled={send.isPending}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          key.current = null;
                          if (
                            file &&
                            (file.size > 5 * 1024 * 1024 ||
                              ![
                                "image/jpeg",
                                "image/png",
                                "image/webp",
                              ].includes(file.type))
                          ) {
                            setImage(undefined);
                            setImageError(t("chatImageInvalid"));
                            event.target.value = "";
                            return;
                          }
                          setImageError("");
                          setImage(file);
                        }}
                      />
                      {image && (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={send.isPending}
                          onClick={() => {
                            setImage(undefined);
                            key.current = null;
                            if (fileInput.current) fileInput.current.value = "";
                          }}
                        >
                          {t("removeAttachment", { name: image.name })}
                        </Button>
                      )}
                      {imageError && (
                        <p role="alert" className="text-destructive">
                          {imageError}
                        </p>
                      )}
                      <QueryError error={send.error} />
                    </FieldGroup>
                  </form>
                )}
              </div>
              <p role="status" className="text-sm text-muted-foreground mt-4">
                {send.isPending ? t("sendingMessage") : notice}
              </p>
              <QueryError error={read.error} />
              {read.isError && read.variables?.readMessageId && (
                <Button
                  variant="outline"
                  disabled={read.isPending || !foreground}
                  onClick={() =>
                    read.mutate({
                      readMessageId: read.variables!.readMessageId,
                    })
                  }
                >
                  {t("retryReadReceipt")}
                </Button>
              )}
              <HostSheet
                open={membersOpen}
                onOpenChange={setMembersOpen}
                title={t("members")}
                description={t("hostMemberVisibility")}
              >
                <ul className="flex flex-col gap-3">
                  {conversation.members?.map((member) => (
                    <li className="py-2 break-words" key={member.id}>
                      {member.displayName || t("account")}
                    </li>
                  ))}
                </ul>
              </HostSheet>
              <HostSheet
                open={!!reportTarget}
                onOpenChange={(open) => {
                  if (!open) setReportTarget(null);
                }}
                title={t("reportMessage")}
                description={t("reportMessageNote")}
              >
                {reportTarget && (
                  <HostMessageReport
                    conversationId={id}
                    message={reportTarget}
                    onDone={() => {
                      setReportTarget(null);
                      setNotice(t("reportSubmitted"));
                    }}
                  />
                )}
              </HostSheet>
            </>
          )
        )}
      </div>
    </SportsFrame>
  );
}

function HostMessageReport({
  conversationId,
  message,
  onDone,
}: {
  conversationId: string;
  message: MessageDto;
  onDone(): void;
}) {
  const t = useTranslations("Luma"),
    id = useId();
  const report = useSportsCommand<
    { ok: boolean },
    { messageId: string; reason: string }
  >(`sports/community/conversations/${conversationId}/report`);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (report.isPending) return;
        const form = new FormData(event.currentTarget);
        report.mutate(
          {
            messageId: message.id,
            reason: String(form.get("reason") ?? "").trim(),
          },
          { onSuccess: onDone },
        );
      }}
    >
      <FieldGroup>
        <blockquote className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
          {message.body.slice(0, 300) || t("image")}
        </blockquote>
        <Field data-disabled={report.isPending}>
          <FieldLabel htmlFor={id}>{t("reportReason")}</FieldLabel>
          <Textarea
            id={id}
            name="reason"
            minLength={3}
            maxLength={1000}
            required
            disabled={report.isPending}
            rows={3}
          />
        </Field>
        <QueryError error={report.error} />
        <Button disabled={report.isPending}>
          {report.isPending ? t("sendingMessage") : t("submitReport")}
        </Button>
      </FieldGroup>
    </form>
  );
}
