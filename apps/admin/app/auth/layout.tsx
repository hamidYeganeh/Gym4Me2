import type { ReactNode } from "react";

import { I18nProvider } from "@repo/i18n";
import { getLocaleConfig } from "@repo/i18n/config";
import { getLocale, getMessages } from "@repo/i18n/server";

import { AuthLayout } from "../../features/auth/index";

const Layout = async (props: { children: ReactNode }) => {
  const { children } = props;
  const [locale, { Auth, Onboarding }] = await Promise.all([getLocale(), getMessages()]);

  return (
    <I18nProvider locale={locale} messages={{ Auth, Onboarding }}>
      <div {...getLocaleConfig(locale)}>
        <AuthLayout panel="admin">{children}</AuthLayout>
      </div>
    </I18nProvider>
  );
};

export default Layout;
