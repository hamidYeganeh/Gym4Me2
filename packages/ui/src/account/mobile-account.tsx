"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "@repo/i18n";
import { useAccount } from "@repo/api/profile";
import { useLogout } from "@repo/api/auth";
import { Bookmark, Settings, Mail, ChevronLeft, Pencil } from "lucide-react";
import { MobilePage } from "../mobile-page";
import { PrivacyDesignPage } from "./privacy-design";
import { ProfileOverview } from "./profile-overview";
import { AccountDesignPage } from "./account-design";
import { MobileProfileEdit } from "./mobile-profile-edit";
import { MobileSettings } from "./mobile-settings";
import { SessionsContent, InvitationsContent } from "./profile";
import { AccountPrivacy, PrivacyNotice } from "./privacy";
import { QueryError, Loading } from "./common";
import { AuthRequired } from "./auth-entry";
import { useAuthRecovery } from "../hooks/use-auth-recovery";
import { accountReadDenied } from "../lib/account-recovery";

type Section =
  "account" | "edit" | "settings" | "sessions" | "invitations" | "privacy";
const paths: Record<Section, string> = {
  account: "/profile",
  edit: "/profile/edit",
  settings: "/profile/settings",
  sessions: "/sessions",
  invitations: "/invitations",
  privacy: "/profile/settings/privacy",
};
function MenuLink({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description?: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-16 items-center gap-3 px-5 py-4 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        {description && (
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      <ChevronLeft className="size-4 shrink-0 text-muted-foreground ltr:rotate-180" />
    </Link>
  );
}
export function MobileAccount({ section = "account" }: { section?: Section }) {
  const t = useTranslations("MobileAccount");
  const simple = useTranslations("SimpleApp");
  const copy = useTranslations("Copy");
  const savedCopy = useTranslations("SavedPages");
  const privacy = useTranslations("Privacy");
  const query = useAccount();
  const logout = useLogout();
  const router = useRouter();
  const [error, setError] = useState<unknown>(null);
  const recovery = useAuthRecovery(query, paths[section]);
  const guest = recovery?.kind === "signIn";
  const account =
    accountReadDenied(query.error) || guest ? undefined : query.data;
  const hadAccount = useRef(false);
  useEffect(() => {
    if (account) hadAccount.current = true;
  }, [account]);
  const title = {
    account: t("title"),
    edit: t("edit"),
    settings: t("settings"),
    sessions: copy("activeSessions"),
    invitations: copy("teamInvitations"),
    privacy: privacy("title"),
  }[section];
  const backHref =
    section === "account"
      ? "/discovery"
      : section === "sessions" || section === "privacy"
        ? paths.settings
        : paths.account;
  async function signOut() {
    setError(null);
    try {
      await logout.mutateAsync(undefined);
      router.replace("/profile");
    } catch (err) {
      setError(err);
    }
  }
  const login = (
    <AuthRequired
      returnTo={paths[section]}
      focusOnEntry={guest && hadAccount.current}
    />
  );
  if (section === "edit" && account)
    return <MobileProfileEdit key={account.id} account={account} />;
  const Shell =
    section === "account"
      ? ProfileOverview
      : section === "privacy"
        ? PrivacyDesignPage
        : section === "settings" || section === "edit"
          ? AccountDesignPage
          : MobilePage;
  return (
    <Shell
      title={title}
      backHref={backHref}
      account={account}
      refreshing={query.isFetching}
      refresh={() => void query.refetch()}
    >
      {query.isLoading && !guest ? (
        <Loading />
      ) : !guest && query.error ? (
        <QueryError error={query.error} retry={query.refetch} />
      ) : (
        <>
          {section === "account" ? (
            <>
              {!account && login}
              {account && <PrivacyNotice href={paths.privacy} />}
              <nav
                aria-label={t("title")}
                className="divide-y divide-border overflow-hidden rounded-4xl border border-border"
              >
                <MenuLink
                  href={paths.edit}
                  title={t("edit")}
                  description={t("editHint")}
                  icon={<Pencil className="size-5" />}
                />
                <MenuLink
                  href={paths.invitations}
                  title={copy("teamInvitations")}
                  icon={<Mail className="size-5" />}
                />
                <MenuLink
                  href="/saved"
                  title={savedCopy("title")}
                  icon={<Bookmark className="size-5" />}
                />
                <MenuLink
                  href="/more"
                  title={simple("more")}
                  icon={<Mail className="size-5" />}
                />
                <MenuLink
                  href={paths.settings}
                  title={t("settings")}
                  description={t("settingsHint")}
                  icon={<Settings className="size-5" />}
                />
              </nav>
            </>
          ) : section === "settings" ? (
            <MobileSettings
              account={account}
              signOut={() => void signOut()}
              signingOut={logout.isPending}
              error={error}
              login={login}
            />
          ) : !account ? (
            login
          ) : section === "sessions" ? (
            <SessionsContent />
          ) : section === "invitations" ? (
            <InvitationsContent />
          ) : (
            <AccountPrivacy mobile />
          )}
        </>
      )}
    </Shell>
  );
}
