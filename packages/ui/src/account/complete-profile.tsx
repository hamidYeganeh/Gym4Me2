"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, UserRound, LoaderCircle } from "lucide-react";
import { useTranslations } from "@repo/i18n";
import { useAccount, useUpdateAccount, usePrivacy } from "@repo/api/profile";
import { ApiError } from "@repo/api";
import { Button } from "../kit/Button";
import { Input } from "../kit/Input";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "../kit/Field";
import { Avatar, AvatarFallback } from "../kit/Avatar";
import { AuthScreen } from "./mobile-auth";
import { ErrorNotice, Loading, QueryError } from "./common";
import { AccountPrivacy } from "./privacy";
import { safeReturnPath } from "./safe-return-path";
import { accountEntryHref } from "../lib/account-recovery";

export function CompleteProfilePage() {
  const t = useTranslations();
  const account = useAccount();
  const update = useUpdateAccount();
  const privacy = usePrivacy(Boolean(account.data));
  const router = useRouter();
  const [name, setName] = useState("");
  const [returnPath, setReturnPath] = useState("/profile");
  useEffect(() => {
    setReturnPath(
      safeReturnPath(
        new URLSearchParams(window.location.search).get("returnTo"),
        "/profile",
      ),
    );
  }, []);
  const valid = name.trim().length >= 2;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (
      !valid ||
      update.isPending ||
      privacy.data?.acceptanceRequired ||
      !privacy.data
    )
      return;
    try {
      await update.mutateAsync({ displayName: name.trim() });
      router.replace(returnPath);
    } catch {
      /* Localized error below. */
    }
  }
  return (
    <AuthScreen
      title={t("AuthDesign.completeTitle")}
      description={t("AuthDesign.completeHint")}
      icon={
        <Avatar className="size-16">
          <AvatarFallback>
            <UserRound className="size-8" />
          </AvatarFallback>
        </Avatar>
      }
      back={
        <Button variant="ghost" asChild>
          <Link href={returnPath}>{t("AuthDesign.later")}</Link>
        </Button>
      }
      actions={
        <Button
          form="complete-profile"
          type="submit"
          size="icon-lg"
          disabled={
            !valid ||
            update.isPending ||
            !account.data ||
            !privacy.data ||
            privacy.data.acceptanceRequired
          }
          aria-label={t("Copy.saveChanges")}
        >
          <Check />
        </Button>
      }
    >
      {account.isLoading || (account.data && privacy.isLoading) ? (
        <Loading />
      ) : account.error instanceof ApiError && account.error.status === 428 ? (
        <AccountPrivacy mobile />
      ) : account.error instanceof ApiError && account.error.status === 401 ? (
        <Button asChild>
          <Link
            href={accountEntryHref(
              "/auth/otp",
              accountEntryHref("/profile/complete", returnPath),
            )}
          >
            {t("MobileAccount.signIn")}
          </Link>
        </Button>
      ) : privacy.data?.acceptanceRequired ? (
        <AccountPrivacy mobile />
      ) : privacy.error && account.data ? (
        <QueryError error={privacy.error} retry={privacy.refetch} />
      ) : account.error ? (
        <QueryError error={account.error} retry={account.refetch} />
      ) : (
        <form
          id="complete-profile"
          onSubmit={submit}
          className="flex flex-1 flex-col gap-6"
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="complete-name">
                {t("Privacy.optionalName")}
              </FieldLabel>
              <Input
                id="complete-name"
                name="displayName"
                placeholder={t("Privacy.optionalName")}
                autoComplete="name"
                maxLength={100}
                minLength={2}
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={update.isPending}
                required
              />
              <FieldDescription>{t("AuthDesign.nameHint")}</FieldDescription>
            </Field>
            <ErrorNotice error={update.error} />
          </FieldGroup>
          <Button
            type="submit"
            data-auth-action
            disabled={!valid || update.isPending}
            className="mt-auto min-h-14 w-full"
          >
            {update.isPending && (
              <LoaderCircle data-icon="inline-start" className="animate-spin" />
            )}
            {t("AuthDesign.finish")}
          </Button>
        </form>
      )}
    </AuthScreen>
  );
}
