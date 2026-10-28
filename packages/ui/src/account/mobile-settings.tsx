"use client";
import { useProductNavigation } from "@repo/api/profile";

import type { Account } from "@repo/api/auth";
import { useLocale, useTranslations } from "@repo/i18n";
import { useChangeLocale } from "@repo/i18n/client-provider";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Bell1Icon as Bell,
  ChevronLeftIcon as ChevronLeft,
  File1Icon as FileText,
  Key1Icon as KeyRound,
  TranslateIcon as Languages,
  LifebuoyIcon as LifeBuoy,
  ArrowSignOut1Icon as LogOut,
  Envelope1Icon as Mail,
  MonitorIcon as Monitor,
  PaletteIcon as Palette,
  Pencil1Icon as Pencil,
  ShieldCheckIcon as ShieldCheck,
} from "../icons";
import { AnimatedThemeToggler } from "../kit/AnimatedThemeToggler";
import { Button } from "../kit/Button";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { Separator } from "../kit/Separator";
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
    <Link href={href} className="settings-row">
      <span
        className="settings-icon"
        data-tone={
          href.includes("privacy")
            ? "green"
            : href.includes("notifications")
              ? "red"
              : href.includes("support")
                ? "blue"
                : href.includes("password")
                  ? "purple"
                  : "gray"
        }
      >
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
    <section className="settings-group">
      {title && (
        <h2 className="px-4 text-sm font-semibold text-muted-foreground">
          {title}
        </h2>
      )}
      <div className="settings-group-surface">{children}</div>
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
  const navigation = useProductNavigation(Boolean(account));
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
        {!navigation.error && navigation.data?.teamInvites && (
          <SettingsRow href="/invitations" icon={<Mail className="size-5" />}>
            {t("Copy.teamInvitations")}
          </SettingsRow>
        )}
      </SettingsGroup>
      <SettingsGroup title={t("AccountDesign.preferences")}>
        <SettingsRow
          href={account ? "/profile/settings/privacy" : "/privacy"}
          icon={<ShieldCheck className="size-5" />}
        >
          {t("Privacy.title")}
        </SettingsRow>
        <Separator />
        <div className="settings-row">
          <span className="settings-icon" data-tone="pink">
            <Palette className="size-5" />
          </span>
          <span className="flex-1 text-sm">
            {t("AccountDesign.appearance")}
          </span>
          <AnimatedThemeToggler
            label={t("AccountDesign.toggleTheme")}
            size="icon-lg"
          />
        </div>
        <Separator />
        <div className="settings-row">
          <span className="settings-icon" data-tone="blue">
            <Languages className="size-5" />
          </span>
          <span className="min-w-0 flex-1 text-sm">{t("Luma.language")}</span>
          <NativeSelect
            className="max-w-36"
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
        <Separator />
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
