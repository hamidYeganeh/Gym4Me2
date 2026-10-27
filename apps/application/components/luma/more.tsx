"use client";
import { useTranslations } from "@repo/i18n";
import { useAccount, useProductNavigation } from "@repo/api/profile";
import { accountReadDenied } from "@repo/ui/lib/account-recovery";
import { LumaPage, Row, Section, QueryState } from "./common";

export function MorePage() {
  const t = useTranslations("SimpleApp"),
    copy = useTranslations("Copy");
  const account = useAccount();
  const navigation = useProductNavigation(
    Boolean(account.data) && !accountReadDenied(account.error),
  );
  const context = navigation.error ? undefined : navigation.data;
  return (
    <LumaPage title={t("more")} back="/">
      <Section title={t("purchasesAndHelp")}>
        <Row title={t("orders")} href="/orders" />
        <Row title={t("saved")} href="/saved" />
        <Row title={t("support")} href="/support" />
        {context?.documents && <Row title={t("documents")} href="/documents" />}
        {context?.waiting && <Row title={t("waitlist")} href="/waitlist" />}
        {context?.messages && <Row title={t("messages")} href="/messages" />}
        {context?.family && <Row title={t("family")} href="/household" />}
        {context?.programHistory && (
          <Row title={t("programHistory")} href="/programs" />
        )}
        {context?.teamInvites && (
          <Row title={copy("teamInvitations")} href="/invitations" />
        )}
      </Section>
      {context?.canCoach && (
        <Section title={t("coaching")}>
          <Row title={t("coachWorkspace")} href="/coaching" />
        </Section>
      )}
      <QueryState query={navigation} compact>
        {null}
      </QueryState>
    </LumaPage>
  );
}
