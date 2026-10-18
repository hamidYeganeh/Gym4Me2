"use client";
import "./invitations.css";
import { useId, useRef, useState } from "react";
import { useTranslations } from "@repo/i18n";
import {
  useSportsCommand,
  useSportsInvitations,
  useSportsQuery,
  type InvitationDto,
  type InvitationRecipientDto,
  type InvitationResultDto,
  type InvitationCreateInput,
  type InvitationCancelInput,
  type ServiceDto,
} from "@repo/api/sports";
import { UserRoundPlus } from "lucide-react";
import { Button } from "../kit/Button";
import { Input } from "../kit/Input";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "../kit/Field";
import { Badge } from "../kit/Badge";
import { Empty, EmptyHeader, EmptyDescription } from "../kit/Empty";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../kit/Dialog";
import { QueryError } from "./query-error";
export function ServiceInvitations({ service }: { service: ServiceDto }) {
  const t = useTranslations("Luma"),
    id = useId();
  const [search, setSearch] = useState(""),
    [recipient, setRecipient] = useState("");
  const [notice, setNotice] = useState<
    "invitationSent" | "invitationAlreadyAnswered" | "invitationRevoked" | null
  >(null);
  const [cancelTarget, setCancelTarget] = useState<InvitationDto | null>(null);
  const query = useSportsInvitations(service.id);
  const recipients = useSportsQuery<InvitationRecipientDto[]>(
    `sports/community/host/services/${service.id}/recipients`,
    { search },
  );
  const published = useSportsQuery<ServiceDto>(
    `sports/services/${service.id}`,
    undefined,
    service.status === "published",
  );
  const create = useSportsCommand<InvitationResultDto, InvitationCreateInput>(
    "sports/community/host/invitations",
  );
  const cancel = useSportsCommand<InvitationResultDto, InvitationCancelInput>(
    `sports/community/host/invitations/${cancelTarget?.id}/cancel`,
  );
  const createKey = useRef<{ user: string; key: string } | null>(null),
    cancelKey = useRef<{ id: string; key: string } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const selected = recipients.data?.find((person) => person.id === recipient);
  const label = (person: { displayName: string | null; phoneSuffix: string }) =>
    `${person.displayName || t("invitationUnnamed")} · ${t("invitationPhoneEnding", { digits: person.phoneSuffix })}`;
  return (
    <section
      className="mt-6 flex flex-col gap-5"
      aria-labelledby={`${id}-title`}
    >
      <div className="flex flex-col gap-1">
        <h3
          ref={heading}
          tabIndex={-1}
          id={`${id}-title`}
          className="font-semibold"
        >
          {t("manageInvitations")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("invitationNote")}</p>
      </div>
      {service.status === "published" ? (
        <>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setRecipient("");
              setSearch(
                String(
                  new FormData(event.currentTarget).get("search") ?? "",
                ).trim(),
              );
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`${id}-search`}>
                  {t("invitationSearch")}
                </FieldLabel>
                <div className="flex gap-2">
                  <Input
                    className="min-h-11 min-w-0"
                    id={`${id}-search`}
                    name="search"
                    maxLength={100}
                    aria-describedby={`${id}-directory-note`}
                  />
                  <Button variant="outline" className="min-h-11" type="submit">
                    {t("search")}
                  </Button>
                </div>
                <FieldDescription id={`${id}-directory-note`}>
                  {t("invitationDirectoryNote")}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
          <QueryError
            error={recipients.error}
            retry={() => recipients.refetch()}
          />
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!selected) return;
              createKey.current =
                createKey.current?.user === recipient
                  ? createKey.current
                  : { user: recipient, key: crypto.randomUUID() };
              create.mutate(
                {
                  serviceId: service.id,
                  userId: recipient,
                  idempotencyKey: createKey.current.key,
                },
                {
                  onSuccess: (result) => {
                    createKey.current = null;
                    setNotice(
                      result.status === "invited"
                        ? "invitationSent"
                        : "invitationAlreadyAnswered",
                    );
                    setRecipient("");
                    heading.current?.focus();
                  },
                },
              );
            }}
          >
            <FieldGroup>
              <Field data-disabled={recipients.isPending}>
                <FieldLabel htmlFor={`${id}-recipient`}>
                  {t("invitationRecipient")}
                </FieldLabel>
                <NativeSelect
                  id={`${id}-recipient`}
                  className="min-h-11"
                  value={recipient}
                  aria-describedby={`${id}-recipient-note`}
                  disabled={recipients.isPending}
                  onChange={(event) => {
                    setRecipient(event.target.value);
                    setNotice(null);
                  }}
                >
                  <NativeSelectOption value="">
                    {recipients.isPending
                      ? t("loading")
                      : t("invitationChooseRecipient")}
                  </NativeSelectOption>
                  {recipients.data?.map((person) => (
                    <NativeSelectOption value={person.id} key={person.id}>
                      {label(person)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldDescription id={`${id}-recipient-note`}>
                  {t(
                    !recipients.isPending &&
                      !recipients.error &&
                      !recipients.data?.length
                      ? "invitationNoRecipients"
                      : "invitationDirectoryLimit",
                  )}
                </FieldDescription>
              </Field>
              {selected && (
                <p className="text-sm break-words">
                  {t("invitationPreview", {
                    person: label(selected),
                    service: published.data?.title ?? service.title,
                  })}
                </p>
              )}
              <Button
                className="min-h-11 self-start"
                type="submit"
                disabled={
                  !selected ||
                  create.isPending ||
                  published.isPending ||
                  !!published.error
                }
              >
                <UserRoundPlus data-icon="inline-start" />
                {create.isPending ? t("loading") : t("sendInvitation")}
              </Button>
            </FieldGroup>
            <QueryError error={create.error} />
            <QueryError
              error={published.error}
              retry={() => published.refetch()}
            />
          </form>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("invitationPublishFirst")}
        </p>
      )}
      <p role="status" className="text-sm text-muted-foreground">
        {notice ? t(notice) : t("invitationListCount", { count: items.length })}
      </p>
      <QueryError error={query.error} retry={() => query.refetch()} />
      {query.isPending ? (
        <p role="status">{t("loading")}</p>
      ) : !items.length && !query.error ? (
        <Empty>
          <EmptyHeader>
            <EmptyDescription>{t("noInvitations")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((invitation) => (
            <li
              key={invitation.id}
              className="flex items-center gap-3 border-b pb-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm break-words">{label(invitation)}</p>
                <Badge variant="secondary">
                  {t(`status.${invitation.status}`)}
                </Badge>
              </div>
              {invitation.status === "invited" && (
                <Button
                  variant="outline"
                  className="min-h-11"
                  onClick={() => {
                    setCancelTarget(invitation);
                    cancel.reset();
                  }}
                >
                  {t("revokeInvitation")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {query.hasNextPage && (
        <Button
          variant="outline"
          className="min-h-11 self-start"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? t("loading") : t("loadMoreInvitations")}
        </Button>
      )}
      <Dialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open && !cancel.isPending) setCancelTarget(null);
        }}
      >
        <DialogContent
          data-sports-invitation-dialog=""
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            heading.current?.focus();
          }}
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>{t("revokeInvitation")}</DialogTitle>
            <DialogDescription>{t("revokeInvitationNote")}</DialogDescription>
          </DialogHeader>
          {cancelTarget && (
            <p className="text-sm break-words">{label(cancelTarget)}</p>
          )}
          <QueryError
            error={cancel.error}
            retry={() => {
              void query.refetch();
              setCancelTarget(null);
            }}
          />
          <DialogFooter>
            <Button
              variant="outline"
              className="min-h-11"
              disabled={cancel.isPending}
              onClick={() => setCancelTarget(null)}
            >
              {t("back")}
            </Button>
            <Button
              className="min-h-11"
              disabled={cancel.isPending || !cancelTarget}
              onClick={() => {
                if (!cancelTarget) return;
                cancelKey.current =
                  cancelKey.current?.id === cancelTarget.id
                    ? cancelKey.current
                    : { id: cancelTarget.id, key: crypto.randomUUID() };
                cancel.mutate(
                  {
                    revision: cancelTarget.revision,
                    idempotencyKey: cancelKey.current.key,
                  },
                  {
                    onSuccess: () => {
                      setCancelTarget(null);
                      setNotice("invitationRevoked");
                    },
                  },
                );
              }}
            >
              {cancel.isPending ? t("loading") : t("revokeInvitation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
