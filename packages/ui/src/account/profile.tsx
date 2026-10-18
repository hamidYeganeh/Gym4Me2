"use client";
import { useTranslations } from "@repo/i18n";

import { useSessions, useRevokeSession } from "@repo/api/auth";
import { useApiContext } from "@repo/api/provider";
import {
  useInvitations,
  useUpdateAccount,
  useAcceptInvitation,
} from "@repo/api/profile";
import type { Account } from "@repo/api/auth";
import type { SessionDto as Session } from "@repo/api/auth";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { PhoneChange } from "./phone-change";
import { AccountPrivacy } from "./privacy";
import { Checkbox } from "@repo/ui/kit/Checkbox";
import { Field, FieldLabel, FieldDescription } from "@repo/ui/kit/Field";

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

  const updateAccount = useUpdateAccount();

  const [name, setName] = useState(account.displayName ?? "");
  const [profilePublic, setProfilePublic] = useState(
    account.profilePublic ?? false,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await updateAccount.mutateAsync({
        displayName: name.trim() || null,
        profilePublic,
      });

      toast.success(t("Copy.profileSaved"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
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
                label={t("Privacy.optionalName")}
                name="displayName"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={100}
              />
              <Field orientation="horizontal">
                <Checkbox
                  id="profile-public"
                  checked={profilePublic}
                  onCheckedChange={(value) => setProfilePublic(value === true)}
                />
                <div>
                  <FieldLabel htmlFor="profile-public">
                    {t("Privacy.publicName")}
                  </FieldLabel>
                  <FieldDescription>
                    {t("Privacy.publicNameHint")}
                  </FieldDescription>
                </div>
              </Field>
              <TextField
                label={t("Copy.verifiedMobileNumber")}
                name="phone"
                dir="ltr"
                value={account.phone}
                readOnly
              />
              <ErrorNotice error={error} />
            </FieldGroup>
            <div>
              <Submit busy={busy}>{t("Copy.saveChanges")}</Submit>
            </div>
          </form>
        </CardContent>
      </Card>
      <PhoneChange />
    </div>
  );
}

export function SessionsContent() {
  const dateLabel = useDateLabel();

  const t = useTranslations();

  const revokeSession = useRevokeSession();
  const { api } = useApiContext();

  const query = useSessions();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function revoke(session: Session) {
    setBusy(session.id);
    setError(null);
    try {
      await revokeSession.mutateAsync({ id: session.id });
      if (session.current)
        router.replace(api.scope[2] === "application" ? "/auth/otp" : "/login");
      else {
        toast.success(t("Copy.sessionEnded"));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <p className="text-muted-foreground">
        {t("Copy.seeYourActiveSessionsAndRevokeAccess")}{" "}
      </p>
      <ErrorNotice error={error} />
      <QueryError error={query.error} retry={query.refetch} />
      {query.isLoading ? (
        <Loading />
      ) : (
        <div className="grid gap-4">
          {query.data?.map((session) => (
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
                      <Badge variant="secondary">{t("Copy.thisSession")}</Badge>
                    )}
                  </div>
                  <p
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
                  disabled={busy !== null}
                  onClick={() => void revoke(session)}
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
    </>
  );
}
export function InvitationsContent() {
  const roleNames = useRoleNames();
  const dateLabel = useDateLabel();

  const t = useTranslations();

  const acceptInvitation = useAcceptInvitation();

  const query = useInvitations();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function accept(id: string) {
    setBusy(id);
    setError(null);
    try {
      await acceptInvitation.mutateAsync({ id });

      toast.success(t("Copy.invitationAcceptedTheOrganizationIsNowAvailable"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <ErrorNotice error={error} />
      <QueryError error={query.error} retry={query.refetch} />
      {query.isLoading ? (
        <Loading />
      ) : !query.error && !query.data?.length ? (
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
                disabled={busy !== null}
                onClick={() => void accept(inv.id)}
              >
                {t("Copy.acceptInvitation")}{" "}
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </>
  );
}
