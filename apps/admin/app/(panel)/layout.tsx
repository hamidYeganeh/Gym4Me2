import type { ReactNode } from "react";

import { I18nProvider } from "@repo/i18n";
import { getLocale, getMessages } from "@repo/i18n/server";

import { PanelLayout } from "../../features/dashboard/PanelLayout";
import { requirePanelSession } from "../../lib/panel-session";

const Layout = async (props: { children: ReactNode }) => {
  const { children } = props;
  await requirePanelSession();
  const [locale, { ClubRequests }] = await Promise.all([getLocale(), getMessages()]);
  return (
    <I18nProvider locale={locale} messages={{ ClubRequests }} timeZone="Asia/Tehran">
      <PanelLayout>{children}</PanelLayout>
    </I18nProvider>
  );
};

export default Layout;
