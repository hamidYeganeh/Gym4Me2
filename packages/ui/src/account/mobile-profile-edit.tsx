"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useTranslations } from "@repo/i18n";
import type { Account } from "@repo/api/auth";
import { Button } from "../kit/Button";
import { Input } from "../kit/Input";
import { Switch } from "../kit/Switch";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "../kit/Field";
import { Separator } from "../kit/Separator";
import { AccountAvatar, AccountDesignPage } from "./account-design";
import { ErrorNotice } from "./common";
import { PhoneChange } from "./phone-change";
import { useProfileEditor } from "./use-profile-editor";

export function MobileProfileEdit({ account }: { account: Account }) {
  const t = useTranslations();
  const editor = useProfileEditor(account);
  const { name, isPublic, invalid, dirty, busy, setName, setPublic, submit } =
    editor;
  return (
    <AccountDesignPage
      title={t("MobileAccount.edit")}
      backHref="/profile/settings"
      actions={
        <Button
          type="submit"
          form={`${editor.id}-form`}
          size="icon-lg"
          className="size-12"
          disabled={!dirty || invalid || busy}
          aria-label={t("Copy.saveChanges")}
        >
          {busy ? <LoaderCircle className="animate-spin" /> : <Check />}
        </Button>
      }
    >
      <div className="flex justify-center py-5">
        <AccountAvatar name={name} large />
      </div>
      <form
        id={`${editor.id}-form`}
        onSubmit={submit}
        className="flex flex-col gap-7"
      >
        <FieldGroup className="account-edit-group gap-0 overflow-hidden rounded-4xl bg-card">
          <Field
            orientation="horizontal"
            className="px-5 py-4"
            data-invalid={invalid}
          >
            <FieldLabel htmlFor={`${editor.id}-name`}>
              {t("Privacy.optionalName")}
            </FieldLabel>
            <FieldContent>
              <Input
                ref={editor.nameInput}
                id={`${editor.id}-name`}
                name="displayName"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                minLength={2}
                aria-invalid={invalid}
                aria-describedby={
                  invalid ? `${editor.id}-name-error` : undefined
                }
                disabled={busy}
              />
              {invalid && (
                <FieldError id={`${editor.id}-name-error`}>
                  {t("Privacy.nameLength")}
                </FieldError>
              )}
            </FieldContent>
          </Field>
          <Separator />
          <Field orientation="horizontal" className="px-5 py-4">
            <FieldLabel htmlFor={`${editor.id}-phone`}>
              {t("Copy.verifiedMobileNumber")}
            </FieldLabel>
            <Input
              id={`${editor.id}-phone`}
              value={account.phone}
              dir="ltr"
              readOnly
            />
          </Field>
        </FieldGroup>
        <section
          className="flex flex-col gap-3"
          aria-labelledby={`${editor.id}-visibility-heading`}
        >
          <h2
            id={`${editor.id}-visibility-heading`}
            className="px-4 text-sm font-semibold text-muted-foreground"
          >
            {t("AccountDesign.visibility")}
          </h2>
          <FieldGroup className="rounded-4xl bg-card p-5">
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel
                  htmlFor={`${editor.id}-public`}
                  className="min-h-11"
                >
                  {t("Privacy.publicName")}
                </FieldLabel>
                <FieldDescription id={`${editor.id}-public-description`}>
                  {t("Privacy.publicNameHint")}
                </FieldDescription>
              </FieldContent>
              <Switch
                id={`${editor.id}-public`}
                aria-describedby={`${editor.id}-public-description`}
                checked={isPublic}
                onCheckedChange={setPublic}
                disabled={busy}
              />
            </Field>
          </FieldGroup>
        </section>
        <ErrorNotice error={editor.error} />
        <Button
          type="submit"
          className="min-h-12 w-full"
          disabled={!dirty || invalid || busy}
        >
          <Check data-icon="inline-start" />
          {t("Copy.saveChanges")}
        </Button>
      </form>
      <section
        className="flex flex-col gap-3"
        aria-labelledby={`${editor.id}-phone-heading`}
      >
        <h2
          id={`${editor.id}-phone-heading`}
          className="px-4 text-sm font-semibold text-muted-foreground"
        >
          {t("AccountDesign.contact")}
        </h2>
        <PhoneChange />
      </section>
    </AccountDesignPage>
  );
}
