"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "@repo/i18n";
import { ApiError } from "@repo/api";
import { usePasswordStatus, useSetPassword } from "@repo/api/auth";
import { AuthScreen } from "./mobile-auth";
import { ChevronLeft, KeyRound } from "lucide-react";
import { FieldGroup } from "../kit/Field";
import { Button } from "../kit/Button";
import { TextField, ErrorNotice, QueryError, Loading, Submit } from "./common";
import { toast } from "../kit/Sonner";
import { safeReturnPath } from "./safe-return-path";
import { applicationAuthHref } from "../lib/auth-routes";
import { useApiContext } from "@repo/api/provider";
export function SetPasswordPage({
  backHref = "/profile/settings",
}: {
  backHref?: string;
}) {
  const t = useTranslations("Password");
  const privacyCopy = useTranslations("Privacy");
  const status = usePasswordStatus();
  const mutation = useSetPassword();
  const router = useRouter();
  const { api } = useApiContext();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [returnTo, setReturnTo] = useState(backHref);
  useEffect(() => {
    setReturnTo(
      safeReturnPath(
        new URLSearchParams(window.location.search).get("returnTo"),
        backHref,
      ),
    );
  }, [backHref]);
  const unauthorized =
    status.error instanceof ApiError && status.error.status === 401;
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError("Password.mismatch");
      return;
    }
    try {
      await mutation.mutateAsync({ password });
      setPassword("");
      setConfirmation("");
      toast.success(t("saved"));
      router.replace(
        api.scope[2] === "application"
          ? applicationAuthHref("password", returnTo)
          : `/login?${new URLSearchParams({ returnTo, method: "password" })}`,
      );
    } catch (err) {
      setError(err);
    }
  }
  return (
    <AuthScreen
      title={t("setTitle")}
      description={t("setHint")}
      icon={<KeyRound className="size-7" />}
      back={
        <Button variant="outline" size="icon-lg" className="size-12" asChild>
          <Link href={backHref} aria-label={privacyCopy("back")}>
            <ChevronLeft className="rtl:rotate-180" />
          </Link>
        </Button>
      }
    >
      {status.isLoading ? (
        <Loading />
      ) : status.error && !unauthorized ? (
        <QueryError error={status.error} retry={status.refetch} />
      ) : status.data?.canSetPassword ? (
        <form onSubmit={submit} className="flex flex-1 flex-col gap-6">
          <FieldGroup>
            <TextField
              name="newPassword"
              type="password"
              autoComplete="new-password"
              label={t("newPassword")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              maxLength={15}
              required
            />
            <TextField
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              label={t("confirmPassword")}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              minLength={6}
              maxLength={15}
              required
            />
            <ErrorNotice error={error} />
          </FieldGroup>
          <div className="mt-auto">
            <Submit
              busy={mutation.isPending}
              disabled={
                password.length < 6 ||
                password.length > 15 ||
                password !== confirmation
              }
            >
              {t("save")}
            </Submit>
          </div>
        </form>
      ) : (
        <div className="grid gap-5 rounded-4xl bg-muted/50 p-6">
          <p className="text-sm leading-7">{t("verifyFirst")}</p>
          <Button asChild>
            <Link href={`/reset-password?${new URLSearchParams({ returnTo })}`}>
              {t("verifyPhone")}
            </Link>
          </Button>
        </div>
      )}
    </AuthScreen>
  );
}
