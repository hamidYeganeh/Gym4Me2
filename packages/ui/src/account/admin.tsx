"use client";
import { FilterSheet } from "../kit/BottomSheet";
import type { TranslationKey } from "@repo/i18n/messages";
import { useLabelMap } from "./common";
import { useTranslations, useLocale } from "@repo/i18n";

import {
  useAdminUsers,
  useAdminOrganizations,
  useAdminAudit,
  useSetUserStatus,
  useReviewOrganization,
} from "@repo/api/admin";
import type { UserStatus } from "@repo/api/auth";
import type { OrganizationStatus } from "@repo/api/business";
import type { PublicationStatus } from "@repo/api/catalog";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@repo/ui/kit/Button";
import { Card, CardContent } from "@repo/ui/kit/Card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/kit/Dialog";
import { Field, FieldLabel } from "@repo/ui/kit/Field";
import { Textarea } from "@repo/ui/kit/Textarea";
import { NativeSelect, NativeSelectOption } from "@repo/ui/kit/NativeSelect";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/kit/Table";

import {
  Blank,
  ErrorNotice,
  Loading,
  QueryError,
  Status,
  Submit,
  TextField,
  useDateLabel,
} from "./common";
export type Decision = { id: string; title: string; status: string };
export function DecisionDialog({
  decision,
  close,
  save,
  kind,
}: {
  decision: Decision | null;
  close: () => void;
  save: (reason: string) => Promise<void>;
  kind: "user" | "organization" | "review";
}) {
  const t = useTranslations();

  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await save(reason);
      setReason("");
      close();
      toast.success(t("Copy.changesSaved"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={decision !== null}
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{decision?.title}</DialogTitle>
          <DialogDescription>
            {kind === "user"
              ? t("Copy.suspendingAnAccountRevokesItsActiveSessions")
              : kind === "review"
                ? t("Copy.thisDecisionAffectsThePublicReviewAnd")
                : t("Copy.theOwnerCanSeeTheDecisionAnd")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-5">
          <Field>
            <FieldLabel htmlFor="decisionReason">
              {t("Copy.decisionReason")}
            </FieldLabel>
            <Textarea
              id="decisionReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={5}
              maxLength={500}
              placeholder={t("Copy.writeAClearBriefReasonForThis")}
            />
          </Field>
          <ErrorNotice error={error} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={close}
            >
              {t("Copy.cancel")}{" "}
            </Button>
            <Submit busy={busy}>{t("Copy.saveDecision")}</Submit>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function Pager({
  page,
  setPage,
  count,
  pageSize = 25,
}: {
  page: number;
  setPage: (p: number) => void;
  count: number;
  pageSize?: number;
}) {
  const locale = useLocale();

  const t = useTranslations();

  return (
    <div className="flex items-center justify-between">
      <Button
        variant="outline"
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
      >
        {t("Copy.previous")}{" "}
      </Button>
      <span className="text-sm text-muted-foreground">
        {t("Copy.page")} {page.toLocaleString(locale)}
      </span>
      <Button
        variant="outline"
        disabled={count < pageSize}
        onClick={() => setPage(page + 1)}
      >
        {t("Copy.next")}{" "}
      </Button>
    </div>
  );
}

export function AdminUsersContent() {
  const dateLabel = useDateLabel();

  const t = useTranslations();

  const statusMutation = useSetUserStatus();

  const [page, setPage] = useState(1);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const query = useAdminUsers({
    page,
    search,
    status: (status || undefined) as UserStatus | undefined,
  });
  const [decision, setDecision] = useState<Decision | null>(null);
  async function save(reason: string) {
    if (!decision) return;
    await statusMutation.mutateAsync({
      id: decision.id,
      input: { status: decision.status as UserStatus, reason },
    });
  }
  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(input);
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <TextField
          label={t("Copy.findUser")}
          name="userSearch"
          fieldClassName="w-full sm:w-64"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("Copy.nameOrMobileNumber")}
          maxLength={100}
        />
        <Field className="w-44">
          <FieldLabel htmlFor="userStatus">{t("Copy.status")}</FieldLabel>
          <NativeSelect
            id="userStatus"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <NativeSelectOption value="">
              {t("Copy.allUsers")}
            </NativeSelectOption>
            <NativeSelectOption value="active">
              {t("Copy.active")}
            </NativeSelectOption>
            <NativeSelectOption value="suspended">
              {t("Copy.suspended")}
            </NativeSelectOption>
          </NativeSelect>
        </Field>
        <Button type="submit">{t("Copy.search")}</Button>
      </form>
      <QueryError error={query.error} retry={query.refetch} />
      {query.isLoading ? (
        <Loading />
      ) : (
        query.data && (
          <>
            {!query.data.length ? (
              <Blank
                title={t("Copy.noUsersFound")}
                description={t("Copy.changeYourSearch")}
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("Copy.user")}</TableHead>
                        <TableHead>{t("Copy.mobileNumber")}</TableHead>
                        <TableHead>{t("Copy.status")}</TableHead>
                        <TableHead>{t("Copy.joined")}</TableHead>
                        <TableHead>{t("Copy.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {query.data.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Link
                              className="font-medium hover:underline"
                              href={`/users/${user.id}`}
                            >
                              {user.displayName ?? t("Copy.unnamed")}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <bdi>{user.phone}</bdi>
                          </TableCell>
                          <TableCell>
                            <Status value={user.status} />
                          </TableCell>
                          <TableCell>{dateLabel(user.createdAt)}</TableCell>
                          <TableCell>
                            {user.isAdmin ? (
                              <span className="text-xs text-muted-foreground">
                                {t("Copy.platformAdministrator")}{" "}
                              </span>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setDecision({
                                    id: user.id,
                                    title:
                                      user.status === "active"
                                        ? t("Copy.suspendUserAccount")
                                        : t("Copy.activateUserAccount"),
                                    status:
                                      user.status === "active"
                                        ? "suspended"
                                        : "active",
                                  })
                                }
                              >
                                {user.status === "active"
                                  ? t("Copy.suspend")
                                  : t("Copy.activate")}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
            <Pager page={page} setPage={setPage} count={query.data.length} />
          </>
        )
      )}
      <DecisionDialog
        key={decision?.id ?? "closed"}
        decision={decision}
        close={() => setDecision(null)}
        save={save}
        kind="user"
      />
    </>
  );
}

export function AdminOrganizationsContent({
  publicationQueue = false,
}: {
  publicationQueue?: boolean;
}) {
  const dateLabel = useDateLabel();

  const t = useTranslations();

  const reviewMutation = useReviewOrganization();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(publicationQueue ? "" : "pending");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [publicationStatus, setPublicationStatus] = useState(
    publicationQueue ? "pending_review" : "",
  );
  const query = useAdminOrganizations({
    page,
    search,
    status: (status || undefined) as OrganizationStatus | undefined,
    publicationStatus: (publicationStatus || undefined) as
      PublicationStatus | undefined,
  });
  const [decision, setDecision] = useState<Decision | null>(null);
  async function save(reason: string) {
    if (!decision) return;
    await reviewMutation.mutateAsync({
      id: decision.id,
      input: {
        status: decision.status as Exclude<OrganizationStatus, "pending">,
        reason,
      },
    });
  }
  return (
    <>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(input);
          setPage(1);
        }}
      >
        <TextField
          label={t("Copy.findOrganization")}
          name="organizationSearch"
          fieldClassName="w-full sm:w-64"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={100}
          placeholder={t("Copy.organizationName")}
        />
        <Field className="w-48">
          <FieldLabel htmlFor="reviewStatus">
            {t("Copy.organizationStatus")}
          </FieldLabel>
          <NativeSelect
            id="reviewStatus"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <NativeSelectOption value="">
              {t("Copy.allOrganizations")}
            </NativeSelectOption>
            <NativeSelectOption value="pending">
              {t("Copy.pendingReview")}{" "}
            </NativeSelectOption>
            <NativeSelectOption value="approved">
              {t("Copy.approved")}
            </NativeSelectOption>
            <NativeSelectOption value="rejected">
              {t("Copy.rejected")}
            </NativeSelectOption>
            <NativeSelectOption value="suspended">
              {t("Copy.suspended")}
            </NativeSelectOption>
          </NativeSelect>
        </Field>
        <Field className="w-48">
          <FieldLabel htmlFor="publicationStatus">
            {t("Copy.publicationStatus")}
          </FieldLabel>
          <NativeSelect
            id="publicationStatus"
            value={publicationStatus}
            onChange={(e) => {
              setPublicationStatus(e.target.value);
              setPage(1);
            }}
          >
            <NativeSelectOption value="">
              {t("Copy.allStatuses")}
            </NativeSelectOption>
            <NativeSelectOption value="draft">
              {t("Copy.draft")}
            </NativeSelectOption>
            <NativeSelectOption value="pending_review">
              {t("Copy.pendingPublication")}{" "}
            </NativeSelectOption>
            <NativeSelectOption value="published">
              {t("Copy.published")}
            </NativeSelectOption>
            <NativeSelectOption value="hidden">
              {t("Copy.hidden")}
            </NativeSelectOption>
          </NativeSelect>
        </Field>
        <Button type="submit">{t("Copy.search")}</Button>
      </form>
      {publicationQueue && (
        <p className="text-sm text-muted-foreground">
          {t("Copy.reviewTheOrganizationRecordAndPublicationReadiness")}{" "}
        </p>
      )}
      <QueryError error={query.error} retry={query.refetch} />
      {query.isLoading ? (
        <Loading />
      ) : (
        query.data && (
          <>
            {!query.data.length ? (
              <Blank
                title={t("Copy.noOrganizationsInThisStatus")}
                description={t("Copy.newOrganizationsEnterTheReviewQueueAfter")}
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("Copy.organization")}</TableHead>
                        <TableHead>{t("Copy.status")}</TableHead>
                        <TableHead>{t("Copy.publication")}</TableHead>
                        <TableHead>{t("Copy.createdOn")}</TableHead>
                        <TableHead>{t("Copy.review")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {query.data.map((org) => (
                        <TableRow key={org.id}>
                          <TableCell>
                            <Link
                              href={`/organizations/${org.id}`}
                              className="font-medium hover:underline"
                            >
                              {org.name}
                            </Link>
                            {org.reviewReason && (
                              <p className="mt-1 max-w-xs whitespace-normal text-xs leading-6 text-muted-foreground">
                                {org.reviewReason}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Status value={org.status} />
                          </TableCell>
                          <TableCell>
                            {org.publicationStatus ? (
                              <Status value={org.publicationStatus} />
                            ) : (
                              t("Copy.noClubProfile")
                            )}
                          </TableCell>
                          <TableCell>{dateLabel(org.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/organizations/${org.id}`}>
                                  {t("Copy.record")}{" "}
                                </Link>
                              </Button>
                              {[
                                {
                                  status: "approved",
                                  label: t("Copy.approve"),
                                },
                                { status: "rejected", label: t("Copy.reject") },
                                {
                                  status: "suspended",
                                  label: t("Copy.suspend"),
                                },
                              ]
                                .filter((item) => item.status !== org.status)
                                .map((item) => (
                                  <Button
                                    key={item.status}
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setDecision({
                                        id: org.id,
                                        title: t("Copy.organizationDecision", {
                                          action: item.label,
                                          name: org.name,
                                        }),
                                        status: item.status,
                                      })
                                    }
                                  >
                                    {item.label}
                                  </Button>
                                ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
            <Pager page={page} setPage={setPage} count={query.data.length} />
          </>
        )
      )}
      <DecisionDialog
        key={`${decision?.id}-${decision?.status}`}
        decision={decision}
        close={() => setDecision(null)}
        save={save}
        kind="organization"
      />
    </>
  );
}

const eventKeys: Record<string, TranslationKey> = {
  "account.password_login": "Password.auditLogin",
  "account.password_changed": "Password.auditChanged",
  "organization.created": "Copy.organizationCreated",
  "branch.created": "Copy.addBranch",
  "team.invited": "Copy.inviteColleague",
  "team.removed": "Copy.teamAccessRemoved",
  "invitation.revoked": "Copy.invitationRevoked",
  "invitation.accepted": "Copy.acceptInvitation",
  "user.status-changed": "Copy.userStatusChanged",
  "organization.reviewed": "Copy.reviewOrganization",
  "admin.granted-by-operator": "Copy.administratorAccessGranted",
  "club.created": "Copy.clubCreated",
  "club.updated": "Copy.clubUpdated",
  "branch.updated": "Copy.branchUpdated",
  "space.saved": "Copy.trainingSpaceSaved",
  "coach.invited": "Copy.coachInvited",
  "coach.ended": "Copy.coachAffiliationEnded",
  "review.moderated": "Copy.reviewModerated",
  "review.replied": "Copy.replyToReview",
  "location.created": "Copy.locationCreated",
  "location.updated": "Copy.locationUpdated",
  "catalog.updated": "Copy.categoryChanged",
};
export function AdminAuditContent({
  organizationId,
  actorId,
}: {
  organizationId?: string;
  actorId?: string;
}) {
  const dateLabel = useDateLabel();
  const eventNames = useEventNames();

  const t = useTranslations();

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ action: "", from: "", to: "" });
  const [input, setInput] = useState(filters);
  const query = useAdminAudit({
    page,
    ...filters,
    from: filters.from || undefined,
    to: filters.to || undefined,
    action: filters.action || undefined,
    organizationId,
    actorId,
  });
  return (
    <>
      <p className="text-muted-foreground">
        {t("Copy.accessChangesAndAdministrativeDecisionsAreRecorded")}{" "}
      </p>
      <FilterSheet
        count={Object.values(filters).filter(Boolean).length}
        onOpen={() => setInput(filters)}
      >
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setFilters(input);
            setPage(1);
          }}
        >
          <Field className="w-64">
            <FieldLabel htmlFor="auditAction">{t("Copy.event")}</FieldLabel>
            <NativeSelect
              id="auditAction"
              value={input.action}
              onChange={(e) => setInput({ ...input, action: e.target.value })}
            >
              <NativeSelectOption value="">
                {t("Copy.allEvents")}
              </NativeSelectOption>
              {Object.entries(eventNames).map(([key, label]) => (
                <NativeSelectOption key={key} value={key}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <TextField
            label={t("Copy.fromDateGregorian")}
            name="auditFrom"
            fieldClassName="w-full sm:w-48"
            type="date"
            dir="ltr"
            value={input.from}
            max={input.to || undefined}
            onChange={(e) => setInput({ ...input, from: e.target.value })}
          />
          <TextField
            label={t("Copy.toDateGregorian")}
            name="auditTo"
            fieldClassName="w-full sm:w-48"
            type="date"
            dir="ltr"
            value={input.to}
            min={input.from || undefined}
            onChange={(e) => setInput({ ...input, to: e.target.value })}
          />
          <Button type="submit">{t("Copy.applyFilters")}</Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              const empty = { action: "", from: "", to: "" };
              setInput(empty);
              setFilters(empty);
              setPage(1);
            }}
          >
            {t("Copy.clear")}{" "}
          </Button>
        </form>
      </FilterSheet>
      <QueryError error={query.error} retry={query.refetch} />
      {query.isLoading ? (
        <Loading />
      ) : (
        query.data && (
          <>
            {!query.data.length ? (
              <Blank
                title={t("Copy.noEventsYet")}
                description={t(
                  "Copy.administrativeChangesAppearHereAfterTheyAre",
                )}
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("Copy.event")}</TableHead>
                        <TableHead>{t("Copy.actor")}</TableHead>
                        <TableHead>{t("Copy.organization")}</TableHead>
                        <TableHead>{t("Copy.description")}</TableHead>
                        <TableHead>{t("Copy.date")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {query.data.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            {eventNames[event.action] ?? event.action}
                          </TableCell>
                          <TableCell>
                            <bdi
                              className="text-xs"
                              title={event.actorId ?? undefined}
                            >
                              {event.actorName ??
                                (event.actorId
                                  ? `${event.actorId.slice(0, 8)}…`
                                  : t("Copy.systemOperator"))}
                            </bdi>
                          </TableCell>
                          <TableCell>
                            {event.organizationId ? (
                              <Link
                                className="hover:underline"
                                href={`/organizations/${event.organizationId}`}
                              >
                                {event.organizationName ??
                                  t("Copy.organizationRecord")}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="max-w-sm whitespace-normal">
                            {typeof event.details.reason === "string"
                              ? event.details.reason
                              : "—"}
                          </TableCell>
                          <TableCell>{dateLabel(event.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
            <Pager page={page} setPage={setPage} count={query.data.length} />
          </>
        )
      )}
    </>
  );
}

export function useEventNames() {
  return useLabelMap(eventKeys);
}
