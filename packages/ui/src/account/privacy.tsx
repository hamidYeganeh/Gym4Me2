"use client";
import { useAccountExportFile } from "./account-export";
import { useState, Suspense, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PrivacyDesignPage } from "./privacy-design";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../kit/Accordion";
import { safeReturnPath } from "./safe-return-path";
import { useTranslations } from "@repo/i18n";
import {
  useAccount,
  useDataPolicy,
  usePrivacy,
  useUpdatePrivacy,
  useExportAccount,
  useRequestDeletion,
  useCancelDeletion,
  type PrivacyDto,
  type DataPolicyDto,
} from "@repo/api/profile";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@repo/ui/kit/Card";
import { Button } from "@repo/ui/kit/Button";
import { Checkbox } from "@repo/ui/kit/Checkbox";
import { Field, FieldLabel, FieldDescription } from "@repo/ui/kit/Field";
import { Alert, AlertDescription } from "@repo/ui/kit/Alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@repo/ui/kit/Dialog";
import { toast } from "@repo/ui/kit/Sonner";
import {
  ErrorNotice,
  QueryError,
  Loading,
  Submit,
  useDateLabel,
} from "./common";

export function DataPolicyContent({ policy }: { policy: DataPolicyDto }) {
  const t = useTranslations("Privacy");
  return (
    <div className="grid gap-5 text-sm leading-7">
      <p>{t("purpose")}</p>
      <p>{t("sharing")}</p>
      <p>{t("ageRule", { age: policy.minimumAge })}</p>
      <dl className="grid gap-4">
        {(
          [
            ["otp", policy.otpRetentionDays],
            ["sessions", policy.sessionRetentionDays],
            ["invitations", policy.invitationRetentionDays],
            ["audit", policy.auditRetentionDays],
          ] as const
        ).map(([key, days]) => (
          <div key={key} className="grid gap-1 sm:grid-cols-2">
            <dt className="font-medium">{t(`${key}Label`)}</dt>
            <dd className="text-muted-foreground">
              {t(`${key}Retention`, { days: Number(days) })}
            </dd>
          </div>
        ))}
      </dl>
      <p>{t("accountRetention", { days: policy.deletionGraceDays })}</p>
      <p>{t("backupRetention", { days: policy.backupRetentionDays })}</p>
      <p>{t("responsibilities")}</p>
      <p>{t("scope")}</p>
      <p className="text-xs text-muted-foreground">
        {t("policyVersion")} <bdi>{policy.version}</bdi>
      </p>
    </div>
  );
}
export function PublicPrivacyPage({ mobile = false }: { mobile?: boolean }) {
  return mobile ? (
    <Suspense fallback={<Loading />}>
      <MobilePrivacyPolicy />
    </Suspense>
  ) : (
    <DesktopPrivacyPolicy />
  );
}
function MobilePrivacyPolicy() {
  const t = useTranslations("Privacy");
  const params = useSearchParams();
  const policy = useDataPolicy();
  const backHref =
    params.get("from") === "login"
      ? `/login?returnTo=${encodeURIComponent(safeReturnPath(params.get("returnTo"), "/profile"))}`
      : "/profile/settings";
  return (
    <PrivacyDesignPage
      backHref={backHref}
      footer={
        <Button asChild className="min-h-14 w-full">
          <Link href={backHref}>{t("back")}</Link>
        </Button>
      }
    >
      <QueryError error={policy.error} retry={policy.refetch} />
      {policy.isPending ? (
        <Loading />
      ) : policy.data ? (
        <Accordion type="single" collapsible>
          <AccordionItem value="data-policy">
            <AccordionTrigger>{t("readPolicy")}</AccordionTrigger>
            <AccordionContent>
              <DataPolicyContent policy={policy.data} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}
    </PrivacyDesignPage>
  );
}
function DesktopPrivacyPolicy() {
  const t = useTranslations("Privacy");
  const policy = useDataPolicy();
  return (
    <main className="mx-auto grid max-w-3xl gap-6 p-5 sm:p-8">
      <div>
        <Button asChild variant="ghost">
          <Link href="/">{t("back")}</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <QueryError error={policy.error} retry={policy.refetch} />
          {policy.isPending ? (
            <Loading />
          ) : policy.data ? (
            <DataPolicyContent policy={policy.data} />
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
export function PrivacyNotice({ href = "/profile" }: { href?: string }) {
  const t = useTranslations("Privacy");
  const mobile = useTranslations("MobileAccount");
  const account = useAccount();
  const query = usePrivacy(Boolean(account.data));
  if (
    !query.data?.acceptanceRequired &&
    query.data?.deletion?.status !== "pending"
  )
    return null;
  return (
    <Alert className="mx-auto max-w-6xl">
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>
          {query.data?.deletion?.status === "pending"
            ? t("pendingNotice")
            : href === "/profile"
              ? t("acceptanceNotice")
              : mobile("consentNotice")}
        </span>
        <Button asChild size="sm" variant="outline">
          <Link href={href}>
            {href === "/profile"
              ? t("reviewSettings")
              : mobile("reviewPrivacy")}
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
function PreferencesForm({ value }: { value: PrivacyDto }) {
  const t = useTranslations("Privacy");
  const mutation = useUpdatePrivacy();
  const [accept, setAccept] = useState(false);
  const [age, setAge] = useState(false);
  const [marketing, setMarketing] = useState(value.marketingConsent);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (value.acceptanceRequired && (!accept || !age)) {
      setError("Privacy.confirmChoices");
      return;
    }
    try {
      await mutation.mutateAsync({
        marketingConsent: marketing,
        ...(value.acceptanceRequired
          ? {
              acceptPolicy: true,
              confirmMinimumAge: true,
              policyVersion: value.policy.version,
            }
          : {}),
      });
      toast.success(t("saved"));
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <form onSubmit={submit} className="grid gap-5">
      {(value.marketingConsent || value.profilePublic) && (
        <div className="flex flex-wrap gap-3">
          {value.marketingConsent && (
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => {
                setError(null);
                void mutation
                  .mutateAsync({ marketingConsent: false })
                  .then(() => toast.success(t("saved")))
                  .catch((err: Error) => setError(err.message));
              }}
            >
              {t("stopMarketing")}
            </Button>
          )}
          {value.profilePublic && (
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => {
                setError(null);
                void mutation
                  .mutateAsync({ hidePublicProfile: true })
                  .then(() => toast.success(t("saved")))
                  .catch((err: Error) => setError(err.message));
              }}
            >
              {t("hidePublicProfile")}
            </Button>
          )}
        </div>
      )}
      {value.acceptanceRequired ? (
        <>
          <Field orientation="horizontal">
            <Checkbox
              id="privacy-accept"
              checked={accept}
              onCheckedChange={(checked) => setAccept(checked === true)}
            />
            <FieldLabel htmlFor="privacy-accept">
              {t("acceptPolicy")}
            </FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Checkbox
              id="privacy-age"
              checked={age}
              onCheckedChange={(checked) => setAge(checked === true)}
            />
            <FieldLabel htmlFor="privacy-age">
              {t("confirmAge", { age: value.policy.minimumAge })}
            </FieldLabel>
          </Field>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t("accepted")}</p>
      )}
      <Field orientation="horizontal">
        <Checkbox
          id="privacy-marketing"
          checked={marketing}
          onCheckedChange={(checked) => setMarketing(checked === true)}
        />
        <div>
          <FieldLabel htmlFor="privacy-marketing">{t("marketing")}</FieldLabel>
          <FieldDescription>{t("marketingHint")}</FieldDescription>
        </div>
      </Field>
      <ErrorNotice error={error} />
      <div>
        <Submit
          busy={mutation.isPending}
          disabled={value.acceptanceRequired && (!accept || !age)}
        >
          {t("savePreferences")}
        </Submit>
      </div>
    </form>
  );
}
export function AccountPrivacy({ mobile = false }: { mobile?: boolean }) {
  const t = useTranslations("Privacy");
  const query = usePrivacy();
  const exportAccount = useExportAccount();
  const exportFile = useAccountExportFile();
  const [exporting, setExporting] = useState(false);
  const requestDeletion = useRequestDeletion();
  const cancelDeletion = useCancelDeletion();
  const dateLabel = useDateLabel();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy =
    exporting ||
    exportAccount.isPending ||
    requestDeletion.isPending ||
    cancelDeletion.isPending;
  async function exportData() {
    setError(null);
    setExporting(true);
    try {
      const result = await exportAccount.mutateAsync(undefined);
      await exportFile(result);
      toast.success(t("exportReady"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExporting(false);
    }
  }
  async function deletion(cancel = false) {
    setError(null);
    try {
      if (cancel) await cancelDeletion.mutateAsync(undefined);
      else await requestDeletion.mutateAsync(undefined);
      setConfirmOpen(false);
      toast.success(t(cancel ? "deletionCancelled" : "deletionRequested"));
    } catch (err) {
      setError((err as Error).message);
    }
  }
  const value = query.data;
  return (
    <Card
      className={
        mobile ? "gap-6 bg-transparent py-0 shadow-none ring-0" : "max-w-2xl"
      }
    >
      <CardHeader className={mobile ? "px-0" : undefined}>
        {!mobile && <CardTitle>{t("title")}</CardTitle>}
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className={mobile ? "grid gap-6 px-0" : "grid gap-6"}>
        <QueryError error={query.error} retry={query.refetch} />
        {query.isPending ? (
          <Loading />
        ) : value ? (
          <>
            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer text-sm font-medium">
                {t("readPolicy")}
              </summary>
              <div className="pt-4">
                <DataPolicyContent policy={value.policy} />
              </div>
            </details>
            <PreferencesForm
              key={`${value.policy.version}:${value.acceptedAt}:${value.marketingConsent}`}
              value={value}
            />
            <div className="grid gap-4 border-t pt-6">
              <p className="text-sm text-muted-foreground">{t("exportHint")}</p>
              <div>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void exportData()}
                >
                  {t("export")}
                </Button>
              </div>
              {value.deletion?.status === "pending" ? (
                <Alert>
                  <AlertDescription className="grid gap-3">
                    <p>
                      {t("pendingUntil", {
                        date: dateLabel(value.deletion.eligibleAfter),
                      })}
                    </p>
                    <div>
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => void deletion(true)}
                      >
                        {t("cancelDeletion")}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      value.canRequestDeletion
                        ? "deleteHint"
                        : "responsibilities",
                      { days: value.policy.deletionGraceDays },
                    )}
                  </p>
                  <div>
                    <Button
                      variant="destructive"
                      disabled={busy || !value.canRequestDeletion}
                      onClick={() => setConfirmOpen(true)}
                    >
                      {t("requestDeletion")}
                    </Button>
                  </div>
                </>
              )}
            </div>
            <ErrorNotice error={error} />
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("deleteTitle")}</DialogTitle>
                  <DialogDescription>
                    {t("deleteConfirmation", {
                      days: value.policy.deletionGraceDays,
                    })}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => setConfirmOpen(false)}
                  >
                    {t("keepAccount")}
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={() => void deletion()}
                  >
                    {t("confirmDeletion")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
