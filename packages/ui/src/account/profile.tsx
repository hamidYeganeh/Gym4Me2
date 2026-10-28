"use client";
import { useTranslations } from "@repo/i18n";

import { useSessions, useRevokeSession } from "@repo/api/auth";
import { useApiContext } from "@repo/api/provider";
import { useInvitations, useAcceptInvitation } from "@repo/api/profile";
import type { Account } from "@repo/api/auth";
import type { SessionDto as Session } from "@repo/api/auth";
import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "../kit/Sileo";
import { Button } from "@repo/ui/kit/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@repo/ui/kit/Card";
import { FieldGroup } from "@repo/ui/kit/Field";
import { Badge } from "@repo/ui/kit/Badge";
import { sessionSignInHref } from "../lib/session-navigation";
import { isActiveSurfaceElement } from "../lib/active-surface";
import { AccountPrivacy } from "./privacy";
import { Checkbox } from "@repo/ui/kit/Checkbox";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@repo/ui/kit/Field";
import { useProfileEditor } from "./use-profile-editor";
import { useActionFocus } from "../hooks/use-action-focus";

import {
  Blank,
  ErrorNotice,
  Loading,
  QueryError,
  Submit,
  TextField,
  useDateLabel,
  useRoleNames,
} from "./common";
export function ProfileContent({
  account,
  mobile = false,
}: {
  account: Account;
  mobile?: boolean;
}) {
  const t = useTranslations();

  const editor = useProfileEditor(account);
  const { name, isPublic, invalid, dirty, busy, setName, setPublic, submit } =
    editor;
  return (
    <div className="grid gap-6">
      {!mobile && <AccountPrivacy />}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t("Copy.accountInformation")}</CardTitle>
          {!mobile && (
            <CardDescription>
              {t("Copy.thisInformationIsSharedAcrossYourApp")}{" "}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-6">
            <FieldGroup>
              <TextField
                ref={editor.nameInput}
                id={`${editor.id}-name`}
                label={t("Privacy.optionalName")}
                name="displayName"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={100}
                disabled={busy}
                aria-invalid={invalid}
                aria-describedby={
                  invalid ? `${editor.id}-name-error` : undefined
                }
              />
              {invalid && (
                <FieldError id={`${editor.id}-name-error`}>
                  {t("Privacy.nameLength")}
                </FieldError>
              )}
              <Field orientation="horizontal">
                <Checkbox
                  id={`${editor.id}-public`}
                  checked={isPublic}
                  onCheckedChange={(value) => setPublic(value === true)}
                  disabled={busy}
                  aria-describedby={`${editor.id}-public-description`}
                />
                <div>
                  <FieldLabel
                    htmlFor={`${editor.id}-public`}
                    className="min-h-11"
                  >
                    {t("Privacy.publicName")}
                  </FieldLabel>
                  <FieldDescription id={`${editor.id}-public-description`}>
                    {t("Privacy.publicNameHint")}
                  </FieldDescription>
                </div>
              </Field>
              <TextField
                id={`${editor.id}-phone`}
                label={t("Copy.verifiedMobileNumber")}
                description={t("ProfileRefresh.phoneFixed")}
                name="phone"
                dir="ltr"
                value={account.phone}
                readOnly
              />
              <ErrorNotice error={editor.error} />
            </FieldGroup>
            <div>
              <Submit
                busy={busy}
                disabled={!dirty || invalid}
                className="min-h-11"
              >
                {t("Copy.saveChanges")}
              </Submit>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/** Keep the next/previous action in order; a removed final row falls back to its named region. */
function listActionTarget(
  origin: HTMLButtonElement,
  list: HTMLDivElement | null,
  selector: string,
) {
  const actions = [
    ...(list?.querySelectorAll<HTMLButtonElement>(selector) ?? []),
  ];
  const index = actions.indexOf(origin);
  const neighbors = [actions[index + 1], actions[index - 1]];
  return () =>
    [origin, ...neighbors, list].find(
      (target) =>
        target &&
        isActiveSurfaceElement(target) &&
        !target.matches(':disabled, [aria-disabled="true"]'),
    ) ?? null;
}

export function SessionsContent() {
  const dateLabel = useDateLabel();

  const t = useTranslations();

  const revokeSession = useRevokeSession();
  const { api, resetSession } = useApiContext();

  const query = useSessions();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const pending = useRef(false);
  const sessionList = useRef<HTMLDivElement>(null);
  const id = useId();
  const beginFocus = useActionFocus(busy !== null);
  async function revoke(session: Session, origin: HTMLButtonElement) {
    if (pending.current) return;
    pending.current = true;
    const finishFocus = beginFocus(
      listActionTarget(origin, sessionList.current, "[data-session-revoke]"),
      origin,
    );
    setBusy(session.id);
    setError(null);
    try {
      await revokeSession.mutateAsync({ id: session.id });
      if (session.current) {
        await resetSession();
        router.replace(sessionSignInHref(api.scope[2], "/sessions"));
      } else {
        toast.success(t("Copy.sessionEnded"));
      }
    } catch (err) {
      setError(err);
    } finally {
      pending.current = false;
      setBusy(null);
      finishFocus();
    }
  }
  return (
    <div
      ref={sessionList}
      role="region"
      aria-label={t("Copy.activeSessions")}
      tabIndex={-1}
      className="grid gap-4 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
    >
      <p className="text-muted-foreground">
        {t("Copy.seeYourActiveSessionsAndRevokeAccess")}{" "}
      </p>
      <QueryError error={error} />
      <QueryError
        error={query.error}
        retry={query.refetch}
        fallback={sessionList}
      />
      {query.isLoading ? (
        <Loading />
      ) : !query.error && !query.data?.length ? (
        <Blank
          title={t("Copy.noActiveSessions")}
          description={t("Copy.signedInDevicesAppearHere")}
        />
      ) : (
        <div className="grid gap-4">
          {!query.error &&
            query.data?.map((session) => (
              <Card key={session.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {{
                          application: t("Copy.application"),
                          business: t("Copy.business"),
                          admin: t("Copy.admin"),
                        }[session.client] ?? session.client}
                      </p>
                      {session.current && (
                        <Badge variant="secondary">
                          {t("Copy.thisSession")}
                        </Badge>
                      )}
                    </div>
                    <p
                      id={`${id}-${session.id}-device`}
                      dir="ltr"
                      className="mt-2 max-w-lg truncate text-start text-xs text-muted-foreground"
                      title={session.device}
                    >
                      {session.device}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("Copy.signedIn")} {dateLabel(session.createdAt)}{" "}
                      {t("Copy.expires2")} {dateLabel(session.expiresAt)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="min-h-11 min-w-11 aria-disabled:opacity-50"
                    data-session-revoke
                    aria-describedby={`${id}-${session.id}-device`}
                    aria-disabled={busy !== null}
                    aria-busy={busy === session.id}
                    onClick={(event) =>
                      void revoke(session, event.currentTarget)
                    }
                  >
                    {session.current
                      ? t("Copy.signOutOfThisSession")
                      : t("Copy.endSession")}
                  </Button>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
export function InvitationsContent() {
  const roleNames = useRoleNames();
  const dateLabel = useDateLabel();

  const t = useTranslations();

  const acceptInvitation = useAcceptInvitation();

  const query = useInvitations();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const pending = useRef(false);
  const invitationList = useRef<HTMLDivElement>(null);
  const beginFocus = useActionFocus(busy !== null);
  async function accept(id: string, origin: HTMLButtonElement) {
    if (pending.current) return;
    pending.current = true;
    const finishFocus = beginFocus(
      listActionTarget(
        origin,
        invitationList.current,
        "[data-invitation-accept]",
      ),
      origin,
    );
    setBusy(id);
    setError(null);
    try {
      await acceptInvitation.mutateAsync({ id });

      toast.success(t("Copy.invitationAcceptedTheOrganizationIsNowAvailable"));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
      pending.current = false;
      finishFocus();
    }
  }
  return (
    <div
      ref={invitationList}
      role="region"
      aria-label={t("Copy.teamInvitations")}
      tabIndex={-1}
      className="grid gap-4 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
    >
      <QueryError error={error} />
      <QueryError
        error={query.error}
        retry={query.refetch}
        fallback={invitationList}
      />
      {query.isLoading ? (
        <Loading />
      ) : query.error ? null : !query.data?.length ? (
        <Blank
          title={t("Copy.noActiveInvitations")}
          description={t("Copy.invitationsSentToYourMobileNumberAppear")}
        />
      ) : (
        query.data?.map((inv) => (
          <Card key={inv.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
              <div>
                <h2 className="font-semibold">{inv.organizationName}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {roleNames[inv.role]} {t("Copy.validUntil")}{" "}
                  {dateLabel(inv.expiresAt)}
                </p>
              </div>
              <Button
                className="min-h-11 min-w-11 aria-disabled:opacity-50"
                data-invitation-accept
                aria-label={t("Copy.acceptInvitationFrom", {
                  name: inv.organizationName,
                })}
                aria-disabled={busy !== null}
                aria-busy={busy === inv.id}
                onClick={(event) => void accept(inv.id, event.currentTarget)}
              >
                {t("Copy.acceptInvitation")}{" "}
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
