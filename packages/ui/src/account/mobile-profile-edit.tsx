"use client";

import type { Account } from "@repo/api/auth";
import { useTranslations } from "@repo/i18n";
import {
  CheckIcon as Check,
  ArrowRotateClockwise1Icon as LoaderCircle,
} from "../icons";
import { Button } from "../kit/Button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "../kit/Field";
import { Input } from "../kit/Input";
import { Separator } from "../kit/Separator";
import { Switch } from "../kit/Switch";
import { AccountAvatar, AccountDesignPage } from "./account-design";
import { ErrorNotice } from "./common";
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
      <header className="flex flex-col items-center gap-3 py-8 text-center">
        <AccountAvatar name={name} large />
        <h2 className="text-xl font-semibold">{name || t("Copy.myProfile")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("ProfileRefresh.hint")}
        </p>
      </header>
      <form
        id={`${editor.id}-form`}
        onSubmit={submit}
        className="flex flex-col gap-7"
      >
        <FieldGroup className="account-edit-group gap-0 overflow-hidden rounded-4xl bg-card">
          <Field className="px-5 py-5" data-invalid={invalid}>
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
          <Field className="px-5 py-5">
            <FieldLabel htmlFor={`${editor.id}-phone`}>
              {t("Copy.verifiedMobileNumber")}
            </FieldLabel>
            <Input
              id={`${editor.id}-phone`}
              value={account.phone}
              dir="ltr"
              readOnly
            />
            <FieldDescription>
              {t("ProfileRefresh.phoneFixed")}
            </FieldDescription>
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
    </AccountDesignPage>
  );
}
