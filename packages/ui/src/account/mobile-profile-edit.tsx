"use client";

import { useState, type FormEvent } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { useTranslations } from "@repo/i18n";
import type { Account } from "@repo/api/auth";
import { useUpdateAccount } from "@repo/api/profile";
import { toast } from "sonner";
import { Button } from "../kit/Button";
import { Input } from "../kit/Input";
import { Switch } from "../kit/Switch";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "../kit/Field";
import { Separator } from "../kit/Separator";
import { AccountAvatar, AccountDesignPage } from "./account-design";
import { ErrorNotice } from "./common";
import { PhoneChange } from "./phone-change";

export function MobileProfileEdit({ account }: { account: Account }) {
  const t = useTranslations();
  const update = useUpdateAccount();
  const [name, setName] = useState(account.displayName ?? "");
  const [isPublic, setPublic] = useState(account.profilePublic ?? false);
  const [saved, setSaved] = useState({
    name: account.displayName ?? "",
    isPublic: account.profilePublic ?? false,
  });
  const dirty = name.trim() !== saved.name || isPublic !== saved.isPublic;
  const invalid = name.trim().length > 0 && name.trim().length < 2;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!dirty || invalid || update.isPending) return;
    try {
      await update.mutateAsync({
        displayName: name.trim() || null,
        profilePublic: isPublic,
      });
      setSaved({ name: name.trim(), isPublic });
      toast.success(t("Copy.profileSaved"));
    } catch {
      /* The localized API error is rendered below. */
    }
  }
  return (
    <AccountDesignPage
      title={t("MobileAccount.edit")}
      backHref="/profile/settings"
      actions={
        <Button
          type="submit"
          form="mobile-profile-edit"
          size="icon-lg"
          className="size-12"
          disabled={!dirty || invalid || update.isPending}
          aria-label={t("Copy.saveChanges")}
        >
          {update.isPending ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Check />
          )}
        </Button>
      }
    >
      <div className="flex justify-center py-5">
        <AccountAvatar name={name} large />
      </div>
      <form
        id="mobile-profile-edit"
        onSubmit={submit}
        className="flex flex-col gap-7"
      >
        <FieldGroup className="account-edit-group gap-0 overflow-hidden rounded-4xl bg-card">
          <Field
            orientation="horizontal"
            className="px-5 py-4"
            data-invalid={invalid}
          >
            <FieldLabel htmlFor="mobile-display-name">
              {t("Privacy.optionalName")}
            </FieldLabel>
            <Input
              id="mobile-display-name"
              name="displayName"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              minLength={2}
              aria-invalid={invalid}
              disabled={update.isPending}
            />
          </Field>
          <Separator />
          <Field orientation="horizontal" className="px-5 py-4">
            <FieldLabel htmlFor="mobile-profile-phone">
              {t("Copy.verifiedMobileNumber")}
            </FieldLabel>
            <Input
              id="mobile-profile-phone"
              value={account.phone}
              dir="ltr"
              readOnly
            />
          </Field>
        </FieldGroup>
        <section
          className="flex flex-col gap-3"
          aria-labelledby="profile-visibility-heading"
        >
          <h2
            id="profile-visibility-heading"
            className="px-4 text-sm font-semibold text-muted-foreground"
          >
            {t("AccountDesign.visibility")}
          </h2>
          <FieldGroup className="rounded-4xl bg-card p-5">
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="mobile-profile-public">
                  {t("Privacy.publicName")}
                </FieldLabel>
                <FieldDescription>
                  {t("Privacy.publicNameHint")}
                </FieldDescription>
              </FieldContent>
              <Switch
                id="mobile-profile-public"
                checked={isPublic}
                onCheckedChange={setPublic}
                disabled={update.isPending}
              />
            </Field>
          </FieldGroup>
        </section>
        <ErrorNotice error={update.error} />
        <Button
          type="submit"
          className="min-h-12 w-full"
          disabled={!dirty || invalid || update.isPending}
        >
          <Check data-icon="inline-start" />
          {t("Copy.saveChanges")}
        </Button>
      </form>
      <section
        className="flex flex-col gap-3"
        aria-labelledby="profile-phone-heading"
      >
        <h2
          id="profile-phone-heading"
          className="px-4 text-sm font-semibold text-muted-foreground"
        >
          {t("AccountDesign.contact")}
        </h2>
        <PhoneChange />
      </section>
    </AccountDesignPage>
  );
}
