"use client";
import Link from "next/link";
import { LumaPage, useLuma } from "./common";
export { SportsInvitations } from "./invitations";
export { MessagesPage } from "./messages";
export { ConversationPage, ConversationDetails } from "./chat";
export { NotificationsPage } from "./notifications";
export { NotificationPreferences } from "./notification-preferences";
export { SupportPage, SupportDetail } from "./support";
export function HostPage() {
  const t = useLuma();
  return (
    <LumaPage title={t("host")} back="/">
      <p className="luma-meta">{t("hostNote")}</p>
      {process.env.NEXT_PUBLIC_BUSINESS_URL ? (
        <a href={process.env.NEXT_PUBLIC_BUSINESS_URL} className="luma-cta">
          {t("openBusiness")}
        </a>
      ) : (
        <Link href="/support" className="luma-cta">
          {t("support")}
        </Link>
      )}
    </LumaPage>
  );
}
