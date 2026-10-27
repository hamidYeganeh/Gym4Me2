"use client";
import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LumaSheet } from "./sheet";
import { useLocale, useTranslations } from "@repo/i18n";
import { NativeSelect } from "@repo/ui/kit/NativeSelect";
import type { ApiError } from "@repo/api";
import {
  useSportsCommand,
  useSportsQuery,
  type TicketDto,
  type TicketSummaryDto,
  type TicketMessageDto,
  type CreateTicketInput,
  type ReplyTicketInput,
  type SupportCategory,
} from "@repo/api/sports";
import { Button } from "@repo/ui/kit/Button";
import { Input } from "@repo/ui/kit/Input";
import { Textarea } from "@repo/ui/kit/Textarea";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldSet,
  FieldLegend,
} from "@repo/ui/kit/Field";
import { ErrorNotice } from "@repo/ui/account";
import { toast } from "@repo/ui/kit/Sileo";
import { Alert, AlertDescription } from "@repo/ui/kit/Alert";
import { useQueryRetry } from "@repo/ui/hooks/use-query-retry";
import {
  isSupportReference,
  validateSupportDraft,
  type SupportDraft,
  type SupportErrors,
} from "../../lib/support-form";
import {
  CommandError,
  Empty,
  LumaPage,
  QueryState,
  Row,
  Section,
  stamp,
  useLuma,
} from "./common";

export function SupportPage() {
  const t = useLuma(),
    locale = useLocale();
  const flow = useTranslations("SupportWorkflow");
  const params = useSearchParams();
  const order = params.get("order") ?? undefined;
  const categories: SupportCategory[] = order
    ? [
        "general",
        "booking_issue",
        "entry_denied",
        "provider_absent",
        "payment",
        "refund",
        "program",
      ]
    : ["general"];
  const requestedCategory = params.get("category") as SupportCategory;
  const [category, setCategory] = useState<SupportCategory>(
    categories.includes(requestedCategory) ? requestedCategory : "general",
  );
  const createKey = useRef<string | null>(null);
  const router = useRouter();
  const [creating, setCreating] = useState(Boolean(order));
  const query = useSportsQuery<TicketSummaryDto[]>("sports/community/support");
  const create = useSportsCommand<TicketSummaryDto, CreateTicketInput>(
    "sports/community/support",
  );
  const denied = [query.error, create.error].find(
    (error) => error && [401, 403].includes(error.status),
  );
  const readable = query.data && !denied;
  const invalidOrder = order !== undefined && !isSupportReference(order);
  return (
    <LumaPage title={t("support")} back="/">
      {readable ? (
        <>
          {query.error && (
            <RefreshFailure
              error={query.error}
              refresh={() => query.refetch()}
            />
          )}
          <button
            type="button"
            className="luma-cta"
            onClick={() => setCreating(true)}
            aria-haspopup="dialog"
            aria-expanded={creating}
          >
            {t("newTicket")}
          </button>
          <LumaSheet
            open={creating}
            onOpenChange={(open) => {
              if (!create.isPending) setCreating(open);
            }}
            title={t("newTicket")}
          >
            {invalidOrder ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {t("supportInvalidOrder")}{" "}
                  <Link
                    className="underline inline-flex min-h-11 items-center"
                    href="/support"
                  >
                    {t("supportGeneralRequest")}
                  </Link>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {order && (
                  <p className="luma-meta mb-4">
                    {t("supportOrderNote")}{" "}
                    <Link
                      className="underline inline-flex min-h-11 items-center"
                      href={`/orders/detail?id=${order}`}
                    >
                      {t("supportViewOrder")}
                    </Link>
                  </p>
                )}
                <SupportForm
                  key={order ?? "general"}
                  pending={create.isPending}
                  error={create.error}
                  initialTitle={
                    category === "general" ? "" : flow(`categories.${category}`)
                  }
                  context={
                    <>
                      <label className="grid gap-2 text-sm">
                        {flow("category")}
                        <NativeSelect
                          value={category}
                          onChange={(e) => {
                            setCategory(e.target.value as SupportCategory);
                            createKey.current = null;
                            create.reset();
                          }}
                        >
                          {categories.map((value) => (
                            <option key={value} value={value}>
                              {flow(`categories.${value}`)}
                            </option>
                          ))}
                        </NativeSelect>
                      </label>
                      {["entry_denied", "provider_absent"].includes(
                        category,
                      ) && <p className="luma-meta">{flow("urgentHint")}</p>}
                    </>
                  }
                  onEdit={() => {
                    createKey.current = null;
                    create.reset();
                  }}
                  save={async (draft) => {
                    createKey.current ??= crypto.randomUUID();
                    const ticket = await create.mutateAsync({
                      title: draft.title.trim(),
                      body: draft.body.trim(),
                      orderId: order,
                      category: order ? category : "general",
                      idempotencyKey: createKey.current,
                    });
                    createKey.current = null;
                    // Unmount with the new route. Closing first would traverse the
                    // sheet's history entry concurrently with router.push().
                    router.push(`/support/detail?id=${ticket.id}`);
                  }}
                />
              </>
            )}
          </LumaSheet>
          <Section title={t("supportMyTickets")}>
            {query.data!.map((ticket) => (
              <Row
                key={ticket.id}
                title={ticket.title}
                state={ticket.status}
                meta={`${ticket.priority === "urgent" ? `${flow("urgent")} · ` : ""}${stamp(ticket.updatedAt ?? ticket.createdAt, locale)}`}
                href={`/support/detail?id=${ticket.id}`}
              />
            ))}
            {!query.data!.length && <Empty />}
          </Section>
        </>
      ) : (
        <QueryState query={{ ...query, error: denied ?? query.error }}>
          {null}
        </QueryState>
      )}
    </LumaPage>
  );
}

export function SupportDetail() {
  const t = useLuma(),
    locale = useLocale();
  const flow = useTranslations("SupportWorkflow");
  const replyKey = useRef<string | null>(null);
  const id = useSearchParams().get("id");
  const valid = !!id && isSupportReference(id);
  const query = useSportsQuery<TicketDto>(
    `sports/community/support/${id}`,
    undefined,
    valid,
    true,
  );
  const reply = useSportsCommand<TicketMessageDto, ReplyTicketInput>(
    `sports/community/support/${id}/messages`,
  );
  const denied = [query.error, reply.error].find(
    (error) => error && [401, 403].includes(error.status),
  );
  const readable = query.data && !denied;
  return (
    <LumaPage
      title={readable ? query.data!.title : t("support")}
      back="/support"
    >
      {!valid ? (
        <Empty />
      ) : readable ? (
        <>
          {query.error && (
            <RefreshFailure
              error={query.error}
              refresh={() => query.refetch()}
            />
          )}
          <Row
            title={query.data!.title}
            state={query.data!.status}
            meta={stamp(query.data!.createdAt, locale)}
          />
          {query.data!.orderId && (
            <Row
              title={flow("relatedOrder")}
              href={`/orders/detail?id=${query.data!.orderId}`}
            />
          )}
          {query.data!.resolution &&
            (query.data!.status === "resolved" ||
              query.data!.resolution === "refund_review") && (
              <p className="luma-meta">
                {flow(`resolutions.${query.data!.resolution}`)}
              </p>
            )}
          {query.data!.resolution === "refund_review" && (
            <p className="luma-meta">{flow("refundReviewHint")}</p>
          )}
          {query.data!.status === "resolved" && (
            <p className="luma-meta">{flow("reopenHint")}</p>
          )}
          <Section title={t("messages")}>
            <div className="luma-chat">
              {query.data!.messages.map((message) => (
                <article key={message.id} className="luma-bubble">
                  <p className="luma-meta mb-2">
                    {flow(message.fromSupport ? "supportTeam" : "you")}
                  </p>
                  <p className="whitespace-pre-wrap break-words">
                    {message.body}
                  </p>
                  <p className="luma-meta mt-2">
                    <time dateTime={message.createdAt}>
                      {stamp(message.createdAt, locale)}
                    </time>
                  </p>
                </article>
              ))}
            </div>
            {!query.data!.messages.length && <Empty />}
          </Section>
          {Boolean(query.data!.events?.length) && (
            <details className="service-conditions my-4">
              <summary>{flow("history")}</summary>
              {query.data!.events?.map((event) => (
                <p className="luma-meta py-2" key={event.id}>
                  {flow(`events.${event.kind}`)} ·{" "}
                  {stamp(event.createdAt, locale)}
                </p>
              ))}
            </details>
          )}
          <SupportForm
            key={id}
            reply
            pending={reply.isPending}
            error={reply.error}
            onEdit={() => {
              replyKey.current = null;
              reply.reset();
            }}
            save={async (draft) => {
              replyKey.current ??= crypto.randomUUID();
              await reply.mutateAsync({
                body: draft.body.trim(),
                idempotencyKey: replyKey.current,
              });
              replyKey.current = null;
            }}
          />
        </>
      ) : (
        <QueryState query={{ ...query, error: denied ?? query.error }}>
          {null}
        </QueryState>
      )}
    </LumaPage>
  );
}

function RefreshFailure({
  error,
  refresh,
}: {
  error: ApiError;
  refresh(): unknown;
}) {
  const t = useLuma();
  const { button, retrying, run } = useQueryRetry(refresh);
  return (
    <div>
      <ErrorNotice error={error} />
      <Button
        type="button"
        ref={button}
        variant="outline"
        disabled={retrying}
        aria-busy={retrying}
        onClick={run}
      >
        {t("retry")}
      </Button>
    </div>
  );
}

function SupportForm({
  reply = false,
  pending,
  error,
  save,
  onEdit,
  context,
  initialTitle = "",
}: {
  reply?: boolean;
  context?: React.ReactNode;
  initialTitle?: string;
  pending: boolean;
  error: ApiError | null;
  save(draft: SupportDraft): Promise<void>;
  onEdit(): void;
}) {
  const t = useLuma(),
    locale = useLocale(),
    id = useId();
  const [draft, setDraft] = useState<SupportDraft>({
    title: initialTitle,
    body: "",
  });
  const [errors, setErrors] = useState<SupportErrors>({});
  const submitting = useRef(false),
    title = useRef<HTMLInputElement>(null),
    body = useRef<HTMLTextAreaElement>(null);
  function edit(key: keyof SupportDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    onEdit();
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current || pending) return;
    const invalid = validateSupportDraft(draft, reply);
    setErrors(invalid);
    if (Object.keys(invalid).length) {
      (invalid.title ? title : body).current?.focus();
      return;
    }
    submitting.current = true;
    try {
      await save(draft);
      setDraft({ title: "", body: "" });
      toast.success(t(reply ? "supportReplySent" : "supportTicketSent"));
    } catch {
      /* CommandError toasts the server response; retain the draft. */
    } finally {
      submitting.current = false;
    }
  }
  return (
    <form
      noValidate
      onSubmit={submit}
      aria-label={t(reply ? "supportReply" : "newTicket")}
      className="flex flex-col gap-4"
    >
      <FieldSet disabled={pending}>
        <FieldLegend className="sr-only">
          {t(reply ? "supportReply" : "newTicket")}
        </FieldLegend>
        <FieldGroup>
          {context}
          {!reply && (
            <Field
              data-invalid={!!errors.title}
              data-disabled={pending || undefined}
            >
              <FieldLabel htmlFor={`${id}-title`}>{t("title")}</FieldLabel>
              <Input
                ref={title}
                id={`${id}-title`}
                name="title"
                value={draft.title}
                onChange={(e) => edit("title", e.target.value)}
                required
                minLength={3}
                maxLength={160}
                aria-invalid={!!errors.title}
                aria-describedby={`${id}-title-hint${errors.title ? ` ${id}-title-error` : ""}`}
              />
              <FieldDescription id={`${id}-title-hint`}>
                {t("supportTitleHint")}
              </FieldDescription>
              {errors.title && (
                <FieldError id={`${id}-title-error`}>
                  {t(errors.title)}
                </FieldError>
              )}
            </Field>
          )}
          <Field
            data-invalid={!!errors.body}
            data-disabled={pending || undefined}
          >
            <FieldLabel htmlFor={`${id}-body`}>
              {t(reply ? "message" : "description")}
            </FieldLabel>
            <Textarea
              ref={body}
              id={`${id}-body`}
              name="body"
              rows={5}
              value={draft.body}
              onChange={(e) => edit("body", e.target.value)}
              required
              minLength={reply ? 1 : 3}
              maxLength={5000}
              aria-invalid={!!errors.body}
              aria-describedby={`${id}-body-hint${errors.body ? ` ${id}-body-error` : ""}`}
            />
            <FieldDescription id={`${id}-body-hint`}>
              {t("supportBodyHint")}{" "}
              {t("supportCharacters", {
                count: new Intl.NumberFormat(locale).format(draft.body.length),
              })}
            </FieldDescription>
            {errors.body && (
              <FieldError id={`${id}-body-error`}>{t(errors.body)}</FieldError>
            )}
          </Field>
        </FieldGroup>
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="min-h-12 w-full"
        >
          {t(pending ? "saving" : "send")}
        </Button>
      </FieldSet>
      <CommandError error={error} />
    </form>
  );
}
