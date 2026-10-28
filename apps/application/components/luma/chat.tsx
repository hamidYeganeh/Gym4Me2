"use client";
import { useAccount } from "@repo/api/profile";
import { useApiForeground } from "@repo/api/provider";
import {
  useSportsCommand,
  useSportsConversation,
  useSportsQuery,
  type ConversationDetailDto,
  type ConversationDto,
  type ConversationPreferencesInput,
  type ConversationStateDto,
  type ConversationStateInput,
  type MessageDto,
} from "@repo/api/sports";
import { useLocale } from "@repo/i18n";
import {
  ChatIcon as MessageCircle,
  PaperClip1Icon as Paperclip,
  PaperPlaneDiagonalIcon as Send,
  UserIcon as UserRound,
} from "@repo/ui/icons";
import { toast } from "@repo/ui/kit/Sileo";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  CommandError,
  Empty,
  Field,
  LumaPage,
  QueryState,
  Row,
  Section,
  Segments,
  useLuma,
} from "./common";
import { LumaSheet } from "./sheet";
export function ConversationPage() {
  const t = useLuma();
  const locale = useLocale();
  const id = useSearchParams().get("id");
  const me = useAccount();
  const [body, setBody] = useState("");
  const [image, setImage] = useState<File | undefined>();
  const key = useRef<string | null>(null);
  const query = useSportsConversation(id ?? "");
  const data = query.data
    ? {
        conversation: query.data.pages[0]!.conversation,
        messages: [...query.data.pages]
          .reverse()
          .flatMap((page) => page.messages),
      }
    : undefined;
  const send = useSportsCommand(
    `sports/community/conversations/${id}/messages`,
  );
  const read = useSportsCommand<{ ok: boolean }, ConversationPreferencesInput>(
    `sports/community/conversations/${id}/preferences`,
  );
  const scrollArea = useRef<HTMLDivElement>(null);
  const tail = useRef<HTMLDivElement>(null);
  const nearTail = useRef(true);
  const acknowledged = useRef<string | null>(null);
  const foreground = useApiForeground();
  const fileInput = useRef<HTMLInputElement>(null);
  const dayKey = (date: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(date));
  const [fileError, setFileError] = useState("");
  const [reportTarget, setReportTarget] = useState<MessageDto | null>(null);
  const [reportStatus, setReportStatus] = useState("");
  const readCommand = read.mutate;
  const last = data?.messages.at(-1)?.id;
  const reporting = !!reportTarget;
  useEffect(() => {
    if (last && foreground && nearTail.current)
      tail.current?.scrollIntoView({ block: "nearest" });
  }, [last, foreground]);
  useEffect(() => {
    const node = tail.current;
    if (!node || !last || !foreground || reporting || query.isError) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        nearTail.current = Boolean(entry?.isIntersecting);
        if (!entry?.isIntersecting || acknowledged.current === last) return;
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
      { root: scrollArea.current },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [last, foreground, readCommand, reporting, query.isError]);
  if (!id)
    return (
      <LumaPage title={t("messages")} back="/messages">
        <Empty />
      </LumaPage>
    );
  return (
    <LumaPage
      className="luma-conversation-page"
      title={data?.conversation.title ?? t("messages")}
      heading={
        <Link href={`/messages/details?id=${id}`} className="luma-chat-heading">
          <span className="luma-conversation-avatar" aria-hidden="true">
            {data?.conversation.title.trim().slice(0, 2) || (
              <MessageCircle size={18} />
            )}
          </span>
          <span>{data?.conversation.title ?? t("messages")}</span>
        </Link>
      }
      back="/messages"
      actions={
        <Link
          href={`/messages/details?id=${id}`}
          className="luma-icon"
          aria-label={t("details")}
        >
          …
        </Link>
      }
    >
      <div className="luma-conversation-body">
        <QueryState query={query}>
          <>
            <div
              ref={scrollArea}
              className="luma-chat-scroll"
              role="region"
              aria-label={t("messages")}
              tabIndex={0}
            >
              {query.hasNextPage && (
                <button
                  className="luma-cta bg-muted text-foreground mb-4"
                  disabled={query.isFetchingNextPage}
                  onClick={() => {
                    const anchor = data?.messages[0]?.id;
                    void query.fetchNextPage().then(() => {
                      if (anchor)
                        requestAnimationFrame(() =>
                          document
                            .getElementById(`message-${anchor}`)
                            ?.scrollIntoView({ block: "start" }),
                        );
                    });
                  }}
                >
                  {t("loadOlder")}
                </button>
              )}
              <div className="luma-chat">
                {(data?.messages ?? []).map((m, index, messages) => (
                  <Fragment key={m.id}>
                    {(index === 0 ||
                      dayKey(m.createdAt) !==
                        dayKey(messages[index - 1]!.createdAt)) && (
                      <time className="luma-chat-date" dateTime={m.createdAt}>
                        {new Intl.DateTimeFormat(locale, {
                          dateStyle: "medium",
                          timeZone: "Asia/Tehran",
                        }).format(new Date(m.createdAt))}
                      </time>
                    )}
                    <article
                      id={`message-${m.id}`}
                      className="luma-bubble"
                      data-own={m.senderId === me.data?.id}
                    >
                      {m.senderId !== me.data?.id && (
                        <p className="luma-chat-author">{m.displayName}</p>
                      )}
                      {m.imageUrl && (
                        <Image
                          unoptimized
                          width={800}
                          height={800}
                          src={m.imageUrl}
                          alt={t("image")}
                          className="rounded-xl mb-3 max-h-80"
                        />
                      )}
                      <p>{m.body}</p>
                      <p className="luma-chat-receipt">
                        <time dateTime={m.createdAt}>
                          {new Intl.DateTimeFormat(locale, {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Asia/Tehran",
                          }).format(new Date(m.createdAt))}
                        </time>
                        {m.senderId === me.data?.id && (
                          <span className="ms-2">
                            {m.readByCount > 0
                              ? t("messageRead")
                              : t("messageSent")}
                          </span>
                        )}
                      </p>
                      {m.senderId !== me.data?.id && (
                        <details className="luma-message-menu">
                          <summary aria-label={t("reportMessage")}>…</summary>
                          <button
                            type="button"
                            className="luma-shortcut"
                            onClick={() => {
                              setReportStatus("");
                              setReportTarget(m);
                            }}
                          >
                            {t("reportMessage")}
                          </button>
                        </details>
                      )}
                    </article>
                  </Fragment>
                ))}
                {!data?.messages.length && <Empty />}
                <div ref={tail} className="h-px" aria-hidden="true" />
              </div>
            </div>
            {data?.conversation.closed ? (
              <p className="luma-meta mt-6">{t("closedChat")}</p>
            ) : (
              <form
                className="luma-compose"
                onSubmit={(e) => {
                  e.preventDefault();
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
                      setFileError("");
                      if (fileInput.current) fileInput.current.value = "";
                    },
                  });
                }}
              >
                <div className="luma-compose-row">
                  <button
                    type="button"
                    className="luma-icon"
                    aria-label={t("image")}
                    disabled={send.isPending}
                    onClick={() => fileInput.current?.click()}
                  >
                    <Paperclip size={20} />
                  </button>
                  <Field label={t("message")}>
                    <textarea
                      rows={1}
                      placeholder={t("message")}
                      disabled={send.isPending}
                      value={body}
                      onChange={(e) => {
                        setBody(e.target.value);
                        key.current = null;
                      }}
                      maxLength={5000}
                    />
                  </Field>
                  <button
                    type="submit"
                    className="luma-icon luma-compose-send"
                    aria-label={
                      send.isPending ? t("sendingMessage") : t("send")
                    }
                    disabled={(!body.trim() && !image) || send.isPending}
                  >
                    <Send size={20} className="rtl:rotate-180" />
                  </button>
                </div>
                <input
                  hidden
                  aria-label={t("image")}
                  type="file"
                  ref={fileInput}
                  disabled={send.isPending}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    key.current = null;
                    if (
                      file &&
                      (file.size > 5 * 1024 * 1024 ||
                        !["image/jpeg", "image/png", "image/webp"].includes(
                          file.type,
                        ))
                    ) {
                      setImage(undefined);
                      setFileError(t("chatImageInvalid"));
                      e.target.value = "";
                      return;
                    }
                    setFileError("");
                    setImage(file);
                  }}
                />
                {fileError && (
                  <p role="alert" className="text-destructive">
                    {fileError}
                  </p>
                )}
                {image && (
                  <button
                    type="button"
                    className="luma-shortcut"
                    disabled={send.isPending}
                    onClick={() => {
                      setImage(undefined);
                      key.current = null;
                      if (fileInput.current) fileInput.current.value = "";
                    }}
                  >
                    {t("removeAttachment", { name: image.name })}
                  </button>
                )}
                <CommandError error={send.error} />
                <span className="sr-only" role="status">
                  {send.isPending ? t("sendingMessage") : ""}
                </span>
              </form>
            )}
            <CommandError error={read.error} />
            {read.isError && read.variables?.readMessageId && (
              <button
                className="luma-shortcut"
                disabled={read.isPending || !foreground}
                onClick={() =>
                  read.mutate({ readMessageId: read.variables!.readMessageId })
                }
              >
                {t("retryReadReceipt")}
              </button>
            )}
            <p role="status" className="luma-meta">
              {reportStatus}
            </p>
            <LumaSheet
              open={!!reportTarget}
              onOpenChange={(open) => {
                if (!open) setReportTarget(null);
              }}
              title={t("reportMessage")}
              description={t("reportMessageNote")}
            >
              {reportTarget && (
                <MessageReport
                  conversationId={id}
                  message={reportTarget}
                  onDone={() => {
                    setReportTarget(null);
                    setReportStatus(t("reportSubmitted"));
                  }}
                />
              )}
            </LumaSheet>
          </>
        </QueryState>
      </div>
    </LumaPage>
  );
}
export function ConversationDetails() {
  const t = useLuma();
  const [tab, setTab] = useState("details");
  const id = useSearchParams().get("id");
  const query = useSportsQuery<ConversationDetailDto>(
    `sports/community/conversations/${id}`,
    undefined,
    Boolean(id),
  );
  const archive = useSportsCommand<
    { ok: boolean },
    ConversationPreferencesInput
  >(`sports/community/conversations/${id}/preferences`);
  if (!id)
    return (
      <LumaPage title={t("details")} back="/messages">
        <Empty />
      </LumaPage>
    );
  return (
    <LumaPage
      className="luma-conversation-details"
      title={t("details")}
      back={`/messages/conversation?id=${id}`}
    >
      <QueryState query={query}>
        {query.data && (
          <>
            <section className="luma-identity-hero">
              <span className="luma-conversation-avatar" aria-hidden="true">
                {query.data.conversation.title.trim().slice(0, 2)}
              </span>
              <h2>{query.data.conversation.title}</h2>
              <p className="luma-meta">
                {t(query.data.conversation.closed ? "closedChat" : "messages")}
              </p>
            </section>
            <Segments
              value={tab}
              onChange={setTab}
              options={[
                { value: "details", label: t("details") },
                { value: "members", label: t("members") },
              ]}
            />
            {tab === "members" && !!query.data.conversation.members?.length && (
              <Section title={t("members")}>
                {query.data.conversation.members.map((m) => (
                  <Row
                    key={m.id}
                    title={m.displayName ?? t("account")}
                    icon={<UserRound size={24} aria-hidden="true" />}
                  />
                ))}
              </Section>
            )}
            {tab === "details" && query.data.conversation.host && (
              <ConversationState
                conversation={query.data.conversation}
                reload={async () => {
                  const result = await query.refetch();
                  return result.error
                    ? null
                    : (result.data?.conversation ?? null);
                }}
              />
            )}
            {tab === "details" && (
              <button
                className="luma-cta bg-muted text-foreground"
                disabled={archive.isPending}
                onClick={() =>
                  archive.mutate({
                    archived: !query.data?.conversation.archived,
                  })
                }
              >
                {query.data.conversation.archived
                  ? t("unarchive")
                  : t("archive")}
              </button>
            )}
            <CommandError error={archive.error} />
          </>
        )}
      </QueryState>
    </LumaPage>
  );
}
function ConversationState({
  conversation,
  reload,
}: {
  conversation: ConversationDto;
  reload(): Promise<ConversationDto | null>;
}) {
  const t = useLuma(),
    key = useRef<string | null>(null);
  const reasonInput = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState({
      closed: !conversation.closed,
      revision: conversation.revision,
    }),
    [reason, setReason] = useState(""),
    [reloading, setReloading] = useState(false);
  const command = useSportsCommand<
    ConversationStateDto,
    ConversationStateInput
  >(`sports/community/conversations/${conversation.id}/close`);
  return (
    <>
      <button
        type="button"
        className="luma-cta"
        onClick={() => {
          setDraft({
            closed: !conversation.closed,
            revision: conversation.revision,
          });
          key.current = null;
          command.reset();
          setOpen(true);
        }}
      >
        {conversation.closed ? t("openChat") : t("closeChat")}
      </button>
      <LumaSheet
        open={open}
        onOpenChange={(value) => {
          if (!command.isPending && !reloading) setOpen(value);
        }}
        title={draft.closed ? t("closeChat") : t("openChat")}
        description={t("conversationStateHint")}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            key.current ??= crypto.randomUUID();
            command.mutate(
              { ...draft, reason: reason.trim(), idempotencyKey: key.current },
              {
                onSuccess: () => {
                  setOpen(false);
                  setReason("");
                  key.current = null;
                  toast.success(t("conversationStateSaved"));
                },
              },
            );
          }}
        >
          <fieldset disabled={command.isPending || reloading}>
            <Field label={t("reason")}>
              <textarea
                ref={reasonInput}
                value={reason}
                minLength={3}
                maxLength={1000}
                required
                onChange={(event) => {
                  setReason(event.target.value);
                  key.current = null;
                }}
              />
            </Field>
            <button
              type="submit"
              className="luma-cta"
              disabled={reason.trim().length < 3 || command.isPending}
            >
              {command.isPending ? t("saving") : t("applyConversationState")}
            </button>
          </fieldset>
          <CommandError error={command.error} />
          {command.error?.status === 409 && (
            <button
              type="button"
              className="luma-shortcut"
              disabled={reloading}
              onClick={() => {
                setReloading(true);
                void reload()
                  .then((current) => {
                    if (current) {
                      setDraft({ ...draft, revision: current.revision });
                      command.reset();
                      key.current = null;
                      requestAnimationFrame(() => reasonInput.current?.focus());
                    }
                  })
                  .finally(() => setReloading(false));
              }}
            >
              {t("reloadConversation")}
            </button>
          )}
        </form>
      </LumaSheet>
    </>
  );
}
function MessageReport({
  conversationId,
  message,
  onDone,
}: {
  conversationId: string;
  message: MessageDto;
  onDone(): void;
}) {
  const t = useLuma();
  const report = useSportsCommand<
    { ok: boolean },
    { messageId: string; reason: string }
  >(`sports/community/conversations/${conversationId}/report`);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        report.mutate(
          {
            messageId: message.id,
            reason: String(data.get("reason") ?? "").trim(),
          },
          { onSuccess: onDone },
        );
      }}
    >
      <blockquote className="luma-meta mb-4 whitespace-pre-wrap break-words">
        {message.body.slice(0, 300) || t("image")}
      </blockquote>
      <Field label={t("reportReason")}>
        <textarea
          name="reason"
          required
          minLength={3}
          maxLength={1000}
          rows={3}
          disabled={report.isPending}
        />
      </Field>
      <CommandError error={report.error} />
      <button className="luma-cta" disabled={report.isPending}>
        {report.isPending ? t("sendingMessage") : t("submitReport")}
      </button>
    </form>
  );
}
