"use client";
import { ChangeReasonField } from "./change-reason-field";
import { changeReasonError } from "./change-reason";
import { useTranslations } from "@repo/i18n";

import {
  useOrganizations,
  useBranches,
  useTeam,
  useCreateOrganization,
  useCreateBranch,
  useInviteTeam,
  useRemoveMember,
  useRevokeInvitation,
} from "@repo/api/business";
import type {
  OrganizationDto as Organization,
  TeamRole,
} from "@repo/api/business";
import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { teamInvitationErrors } from "./team-invitation";
import {
  isActiveSurfaceElement,
  restoreOverlayFocus,
} from "../lib/active-surface";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@repo/ui/kit/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@repo/ui/kit/Card";
import { Field, FieldGroup, FieldLabel } from "@repo/ui/kit/Field";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@repo/ui/kit/Dialog";

import {
  Blank,
  ErrorNotice,
  Loading,
  QueryError,
  Status,
  Submit,
  TextField,
  useDateLabel,
  useRoleNames,
} from "./common";
export function OrganizationsContent() {
  const roleNames = useRoleNames();

  const t = useTranslations();

  const createOrganization = useCreateOrganization();

  const query = useOrganizations();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createOrganization.mutateAsync({ name });
      setName("");

      toast.success(t("Copy.organizationRegisteredAndAwaitingReview"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("Copy.registerOrganization")}</CardTitle>
          <CardDescription>
            {t("Copy.afterRegistrationYouCanAddBranchesAnd")}{" "}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-4 sm:max-w-lg">
            <TextField
              label={t("Copy.organizationName")}
              name="organizationName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={120}
              placeholder={t("Copy.forExampleAriaSportsClub")}
            />
            <ErrorNotice error={error} />
            <div>
              <Submit busy={busy}>
                <Plus data-icon="inline-start" />
                {t("Copy.organizationCreated")}{" "}
              </Submit>
            </div>
          </form>
        </CardContent>
      </Card>
      <QueryError error={query.error} retry={query.refetch} />
      {query.isLoading ? (
        <Loading />
      ) : !query.error && !query.data?.length ? (
        <Blank
          title={t("Copy.noOrganizationsYet")}
          description={t("Copy.registerYourFirstOrganizationUsingTheForm")}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {query.data?.map((org) => (
            <Card key={org.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{org.name}</CardTitle>
                  <Status value={org.status} />
                </div>
                <CardDescription>
                  {t("Copy.yourRole")} {roleNames[org.role]}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <Link href={`/organizations/${org.id}`}>
                    {t("BusinessCatalog.editClub")}
                  </Link>
                </Button>
              </CardContent>
              {org.reviewReason && (
                <CardContent>
                  <p className="text-sm leading-7 text-muted-foreground">
                    {t("Copy.reviewResult")} {org.reviewReason}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

export function BranchesContent({
  organization,
}: {
  organization: Organization;
}) {
  const dateLabel = useDateLabel();

  const t = useTranslations();

  const createBranch = useCreateBranch();

  const query = useBranches(organization.id);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createBranch.mutateAsync({
        organizationId: organization.id,
        input: { name },
      });
      setName("");

      toast.success(t("Copy.branchAdded"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {(organization.role === "owner" ||
        (organization.role === "manager" && organization.allBranches)) && (
        <Card>
          <CardHeader>
            <CardTitle>{t("Copy.addBranch")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="grid max-w-lg gap-4">
              <TextField
                label={t("Copy.branchName")}
                name="branchName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={120}
              />
              <ErrorNotice error={error} />
              <div>
                <Submit busy={busy}>{t("Copy.addBranch")}</Submit>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      <QueryError error={query.error} retry={query.refetch} />
      {query.isLoading ? (
        <Loading />
      ) : !query.error && !query.data?.length ? (
        <Blank
          title={t("Copy.noBranchesRegistered")}
          description={t("Copy.theOrganizationOwnerOrManagerCanAdd")}
        />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Copy.branch")}</TableHead>
                  <TableHead>{t("Copy.timeZone")}</TableHead>
                  <TableHead>{t("Copy.createdOn")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data?.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">
                      <Link
                        className="underline underline-offset-4"
                        href={`/organizations/${organization.id}/branches/${branch.id}`}
                      >
                        {branch.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <bdi>{branch.timezone}</bdi>
                    </TableCell>
                    <TableCell>{dateLabel(branch.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}

export function TeamContent({ organization }: { organization: Organization }) {
  const roleNames = useRoleNames();
  const dateLabel = useDateLabel();

  const t = useTranslations();

  const inviteTeam = useInviteTeam();
  const removeMember = useRemoveMember();
  const revokeInvitation = useRevokeInvitation();

  const query = useTeam(organization.id, organization.role === "owner");
  const branches = useBranches(organization.id);
  const [allBranches, setAllBranches] = useState(true);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [inviteReason, setInviteReason] = useState("");
  const [removalReason, setRemovalReason] = useState("");
  const [removalAttempted, setRemovalAttempted] = useState(false);
  const removalDialog = useRef<HTMLDivElement>(null);
  const [role, setRole] = useState("receptionist");
  const pending = useRef(false);
  const inviteForm = useRef<HTMLFormElement>(null);
  const removalTrigger = useRef<HTMLButtonElement | null>(null);
  const formId = useId();
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removal, setRemoval] = useState<{
    id: string;
    invitation: boolean;
  } | null>(null);
  const validation = teamInvitationErrors({
    phone,
    reason: inviteReason,
    allBranches,
    branchIds,
    availableBranchIds:
      !branches.error && branches.data
        ? branches.data.map((branch) => branch.id)
        : undefined,
  });
  const fieldErrors = attempted ? validation : {};
  async function invite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending.current) return;
    setAttempted(true);
    setError(null);
    const form = e.currentTarget;
    const origin =
      document.activeElement === document.body
        ? (e.nativeEvent as SubmitEvent).submitter
        : document.activeElement;
    const target = validation.phone
      ? '[name="invitePhone"]'
      : validation.reason
        ? "[data-change-reason]"
        : validation.scope
          ? "[data-team-scope] input"
          : null;
    if (target) {
      requestAnimationFrame(() => {
        if (
          isActiveSurfaceElement(form) &&
          (document.activeElement === origin ||
            document.activeElement === document.body)
        )
          form.querySelector<HTMLElement>(target)?.focus();
      });
      return;
    }
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await inviteTeam.mutateAsync({
        organizationId: organization.id,
        input: {
          phone,
          reason: inviteReason.trim(),
          role: role as TeamRole,
          ...(allBranches ? {} : { branchIds }),
        },
      });
      setPhone("");
      setInviteReason("");
      setAttempted(false);

      toast.success(t("Copy.theInvitationWillAppearInTheAccount"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
      requestAnimationFrame(() => {
        if (
          origin instanceof HTMLElement &&
          isActiveSurfaceElement(origin) &&
          document.activeElement === document.body
        )
          origin.focus();
      });
    }
  }
  async function remove() {
    if (!removal || pending.current) return;
    setRemovalAttempted(true);
    if (changeReasonError(removalReason)) {
      requestAnimationFrame(() => {
        const target =
          removalDialog.current?.querySelector<HTMLTextAreaElement>(
            "[data-change-reason]",
          );
        if (target && isActiveSurfaceElement(target)) target.focus();
      });
      return;
    }
    pending.current = true;
    const origin = document.activeElement;
    setBusy(true);
    setError(null);
    try {
      if (removal.invitation)
        await revokeInvitation.mutateAsync({
          organizationId: organization.id,
          invitationId: removal.id,
          input: { reason: removalReason.trim() },
        });
      else
        await removeMember.mutateAsync({
          organizationId: organization.id,
          memberId: removal.id,
          input: { reason: removalReason.trim() },
        });
      setRemoval(null);

      toast.success(t("Copy.accessRevoked"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
      requestAnimationFrame(() => {
        if (
          origin instanceof HTMLElement &&
          isActiveSurfaceElement(origin) &&
          document.activeElement === document.body
        )
          origin.focus();
      });
    }
  }
  function restoreRemovalFocus() {
    const target = isActiveSurfaceElement(removalTrigger.current)
      ? removalTrigger.current
      : (inviteForm.current?.querySelector<HTMLInputElement>(
          '[name="invitePhone"]',
        ) ?? null);
    restoreOverlayFocus(target);
    requestAnimationFrame(() => {
      if (target && document.activeElement === target) {
        const rect = target.getBoundingClientRect();
        if (rect.top < 8 || rect.bottom > innerHeight - 8)
          target.scrollIntoView({
            block: "nearest",
            inline: "nearest",
            behavior: "instant",
          });
      }
    });
  }
  if (organization.role !== "owner")
    return (
      <Blank
        title={t("Copy.onlyTheOwnerCanManageTheTeam")}
        description={t("Copy.contactTheOrganizationOwnerToChangeTeam")}
      />
    );
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("Copy.inviteColleague")}</CardTitle>
          <CardDescription>
            {t("Copy.yourColleagueCanSignInToBusiness")}{" "}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            ref={inviteForm}
            noValidate
            onSubmit={invite}
            className="max-w-xl"
          >
            <fieldset
              disabled={busy}
              aria-label={t("Copy.inviteColleague")}
              aria-busy={busy}
              className="grid min-w-0 gap-5"
            >
              <FieldGroup className="sm:grid sm:grid-cols-2">
                <div className="grid gap-2">
                  <TextField
                    label={t("Copy.colleagueMobileNumber")}
                    name="invitePhone"
                    id={`${formId}-phone`}
                    className="min-h-11"
                    type="tel"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    maxLength={20}
                    aria-invalid={Boolean(fieldErrors.phone) || undefined}
                    aria-describedby={
                      fieldErrors.phone ? `${formId}-phone-error` : undefined
                    }
                  />
                  {fieldErrors.phone && (
                    <p
                      id={`${formId}-phone-error`}
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {t(fieldErrors.phone)}
                    </p>
                  )}
                </div>
                <Field>
                  <FieldLabel htmlFor={`${formId}-role`}>
                    {t("Copy.organizationRole")}
                  </FieldLabel>
                  <NativeSelect
                    id={`${formId}-role`}
                    className="min-h-11"
                    style={{ minHeight: 44 }}
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    {["manager", "receptionist", "accountant"].map((r) => (
                      <NativeSelectOption key={r} value={r}>
                        {roleNames[r]}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              </FieldGroup>
              <ChangeReasonField
                value={inviteReason}
                onChange={setInviteReason}
                error={fieldErrors.reason}
                disabled={busy}
              />
              <fieldset
                data-team-scope
                className="grid min-w-0 gap-2 [&_button]:min-h-11"
                aria-invalid={Boolean(fieldErrors.scope) || undefined}
                aria-describedby={
                  [
                    !allBranches && `${formId}-scope-hint`,
                    fieldErrors.scope && `${formId}-scope-error`,
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
              >
                <legend className="mb-2 text-sm font-medium">
                  {t("StaffScope.title")}
                </legend>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={allBranches}
                    onChange={(event) => setAllBranches(event.target.checked)}
                  />
                  {t("StaffScope.all")}
                </label>
                {!allBranches && (
                  <>
                    <QueryError
                      error={branches.error}
                      retry={branches.refetch}
                    />
                    {branches.isLoading && <Loading />}
                    <div className="flex flex-wrap gap-3">
                      {(branches.data ?? []).map((branch) => (
                        <label
                          key={branch.id}
                          className="flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={branchIds.includes(branch.id)}
                            onChange={(event) =>
                              setBranchIds(
                                event.target.checked
                                  ? [...branchIds, branch.id]
                                  : branchIds.filter((id) => id !== branch.id),
                              )
                            }
                          />
                          {branch.name}
                        </label>
                      ))}
                    </div>
                    <p
                      id={`${formId}-scope-hint`}
                      className="text-xs text-muted-foreground"
                    >
                      {t("StaffScope.selectedHint")}
                    </p>
                  </>
                )}
                {fieldErrors.scope && (
                  <p
                    id={`${formId}-scope-error`}
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {t(fieldErrors.scope)}
                  </p>
                )}
              </fieldset>
              <ErrorNotice error={error} />
              <div>
                <Submit busy={busy} className="min-h-11">
                  {t("Copy.sendTeamInvitation")}
                </Submit>
              </div>
            </fieldset>
          </form>
        </CardContent>
      </Card>
      <QueryError error={query.error} retry={query.refetch} />
      {query.isLoading ? (
        <Loading />
      ) : (
        query.data && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{t("Copy.teamMembers")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("Copy.colleague")}</TableHead>
                      <TableHead>{t("Copy.role")}</TableHead>
                      <TableHead>{t("Copy.access")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {query.data.members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <p>{member.displayName ?? t("Copy.unnamed")}</p>
                          <bdi className="text-xs text-muted-foreground">
                            {member.phone}
                          </bdi>
                        </TableCell>
                        <TableCell>
                          {roleNames[member.role]}
                          <p className="text-xs text-muted-foreground">
                            {member.allBranches
                              ? t("StaffScope.all")
                              : member.branchIds
                                  .map(
                                    (id) =>
                                      branches.data?.find(
                                        (branch) => branch.id === id,
                                      )?.name ?? id,
                                  )
                                  .join(" · ")}
                          </p>
                        </TableCell>
                        <TableCell>
                          {member.role !== "owner" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="min-h-11 min-w-11"
                              disabled={busy}
                              onClick={(event) => {
                                removalTrigger.current = event.currentTarget;
                                setRemovalReason("");
                                setRemovalAttempted(false);
                                setError(null);
                                setRemoval({
                                  id: member.id,
                                  invitation: false,
                                });
                              }}
                            >
                              {t("Copy.revokeAccess")}{" "}
                            </Button>
                          ) : (
                            t("Copy.organizationOwner")
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("Copy.pendingInvitations")}</CardTitle>
              </CardHeader>
              <CardContent>
                {!query.data.invitations.length ? (
                  <Blank
                    title={t("Copy.noPendingInvitations")}
                    description={t(
                      "Copy.validInvitationsThatHaveNotBeenAccepted",
                    )}
                  />
                ) : (
                  <div className="grid gap-4">
                    {query.data.invitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <bdi>{inv.phone}</bdi>
                          <p className="text-sm text-muted-foreground">
                            {roleNames[inv.role]} {t("Copy.until")}{" "}
                            {dateLabel(inv.expiresAt)}
                            <span className="block">
                              {inv.allBranches
                                ? t("StaffScope.all")
                                : inv.branchIds
                                    .map(
                                      (id) =>
                                        branches.data?.find(
                                          (branch) => branch.id === id,
                                        )?.name ?? id,
                                    )
                                    .join(" · ")}
                            </span>
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-11 min-w-11"
                          disabled={busy}
                          onClick={(event) => {
                            removalTrigger.current = event.currentTarget;
                            setRemovalReason("");
                            setRemovalAttempted(false);
                            setError(null);
                            setRemoval({ id: inv.id, invitation: true });
                          }}
                        >
                          {t("Copy.invitationRevoked")}{" "}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )
      )}
      <Dialog
        open={removal !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setRemoval(null);
        }}
      >
        <DialogContent
          ref={removalDialog}
          className="[&_button]:min-h-11 [&_button]:min-w-11"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            restoreRemovalFocus();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {t("Copy.revoke")}{" "}
              {removal?.invitation
                ? t("Copy.teamInvitation")
                : t("Copy.teamAccess")}
            </DialogTitle>
            <DialogDescription>
              {t("Copy.thisPersonSOrganizationAccessWillEnd")}{" "}
            </DialogDescription>
          </DialogHeader>
          <ChangeReasonField
            value={removalReason}
            onChange={setRemovalReason}
            error={
              removalAttempted ? changeReasonError(removalReason) : undefined
            }
            disabled={busy}
          />
          <ErrorNotice error={error} />
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setRemoval(null)}
            >
              {t("Copy.cancel")}{" "}
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => void remove()}
            >
              {t("Copy.confirmRevocation")}{" "}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
