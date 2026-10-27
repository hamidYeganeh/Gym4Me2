"use client";
import { useTranslations } from "@repo/i18n";
import { LumaPage, Row, Section } from "./common";

export function MorePage() {
  const t = useTranslations("SimpleApp");
  return (
    <LumaPage title={t("more")} back="/">
      <Section title={t("purchasesAndHelp")}>
        <Row title={t("orders")} href="/orders" />
        <Row title={t("saved")} href="/saved" />
        <Row title={t("documents")} href="/documents" />
        <Row title={t("waitlist")} href="/waitlist" />
        <Row title={t("support")} href="/support" />
      </Section>
      <Section title={t("coaching")}>
        <Row title={t("coaches")} href="/coaches" />
        <Row title={t("programs")} href="/programs" />
        <Row title={t("training")} href="/training" />
        <Row title={t("coachWorkspace")} href="/coaching" />
        <Row title={t("messages")} href="/messages" />
      </Section>
      <details className="service-conditions">
        <summary>{t("otherActivity")}</summary>
        <Row title={t("family")} href="/household" />
        <Row title={t("invitations")} href="/invitations/sports" />
      </details>
    </LumaPage>
  );
}
