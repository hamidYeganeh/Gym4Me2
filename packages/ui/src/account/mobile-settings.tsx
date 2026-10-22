"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Account } from "@repo/api/auth";
import { useChangeLocale } from "@repo/i18n/client-provider";
import { useLocale, useTranslations } from "@repo/i18n";
import {
  ChevronLeft,
  KeyRound,
  Monitor,
  ShieldCheck,
  Palette,
  Mail,
  Pencil,
  LogOut,
  FileText,
  Languages,
  Bell,
  LifeBuoy,
} from "lucide-react";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { Separator } from "../kit/Separator";
import { Button } from "../kit/Button";
import { AnimatedThemeToggler } from "../kit/AnimatedThemeToggler";
import { AccountAvatar } from "./account-design";
import { ErrorNotice } from "./common";

function SettingsRow({
  href,
  icon,
  children,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-16 items-center gap-4 px-5 py-4 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-sm">{children}</span>
      <ChevronLeft className="size-4 shrink-0 text-muted-foreground ltr:rotate-180" />
    </Link>
  );
}
function SettingsGroup({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      {title && (
        <h2 className="px-4 text-sm font-semibold text-muted-foreground">
          {title}
        </h2>
      )}
      <div className="overflow-hidden rounded-3xl border border-border bg-card">{children}</div>
    </section>
  );
}
export function MobileSettings({
  account,
  signOut,
  signingOut,
  error,
  login,
}: {
  account?: Account;
  signOut: () => void;
  signingOut: boolean;
  error: unknown;
  login: ReactNode;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const changeLocale = useChangeLocale();
  return (
    <>
      {account ? (
        <SettingsGroup>
          <Link
            href="/profile"
            className="flex items-center gap-4 px-5 py-5 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            <AccountAvatar name={account.displayName} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold">
                {account.displayName || t("ProfileOverview.you")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("AccountDesign.viewProfile")}
              </p>
            </div>
            <ChevronLeft className="size-4 text-muted-foreground ltr:rotate-180" />
          </Link>
          <Separator />
          <SettingsRow
            href="/profile/edit"
            icon={<Pencil className="size-5" />}
          >
            {t("MobileAccount.edit")}
          </SettingsRow>
        </SettingsGroup>
      ) : (
        login
      )}
      <SettingsGroup title={t("AccountDesign.account")}>
        <SettingsRow
          href="/set-password"
          icon={<KeyRound className="size-5" />}
        >
          {t("MobileAccount.password")}
        </SettingsRow>
        <Separator />
        <SettingsRow href="/sessions" icon={<Monitor className="size-5" />}>
          {t("Copy.activeSessions")}
        </SettingsRow>
        <Separator />
        <SettingsRow href="/invitations" icon={<Mail className="size-5" />}>
          {t("Copy.teamInvitations")}
        </SettingsRow>
      </SettingsGroup>
      <SettingsGroup title={t("AccountDesign.preferences")}>
        <SettingsRow
          href={account ? "/profile/settings/privacy" : "/privacy"}
          icon={<ShieldCheck className="size-5" />}
        >
          {t("Privacy.title")}
        </SettingsRow>
        <Separator />
        <div className="flex min-h-16 items-center gap-4 px-5 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <Palette className="size-5" />
          </span>
          <span className="flex-1 text-base">
            {t("AccountDesign.appearance")}
          </span>
          <AnimatedThemeToggler
            label={t("AccountDesign.toggleTheme")}
            size="icon-lg"
          />
        </div>
      </SettingsGroup>
      <SettingsGroup title={t("Luma.language")}>
        <div className="flex min-h-16 items-center gap-4 px-5 py-4">
          <Languages className="size-5" />
          <NativeSelect
            aria-label={t("Luma.language")}
            value={locale}
            onChange={(e) => {
              void changeLocale(e.target.value === "en" ? "en" : "fa");
            }}
          >
            <NativeSelectOption value="fa">
              {t("Luma.languageNameFa")}
            </NativeSelectOption>
            <NativeSelectOption value="en">
              {t("Luma.languageNameEn")}
            </NativeSelectOption>
          </NativeSelect>
        </div>
      </SettingsGroup>
      <SettingsGroup title={t("Luma.notifications")}>
        <SettingsRow
          href="/notifications/preferences"
          icon={<Bell className="size-5" />}
        >
          {t("Luma.notifications")}
        </SettingsRow>
      </SettingsGroup>
      <SettingsGroup title={t("AccountDesign.resources")}>
        <SettingsRow href="/privacy" icon={<FileText className="size-5" />}>
          {t("AccountDesign.dataPolicy")}
        </SettingsRow>
        <Separator />
        <SettingsRow href="/support" icon={<LifeBuoy className="size-5" />}>
          {t("Luma.support")}
        </SettingsRow>
      </SettingsGroup>
      {account && (
        <Button
          variant="destructive"
          className="min-h-14 w-full"
          disabled={signingOut}
          onClick={signOut}
        >
          <LogOut data-icon="inline-start" />
          {t("Copy.signOut")}
        </Button>
      )}
      <ErrorNotice error={error} />
    </>
  );
}
