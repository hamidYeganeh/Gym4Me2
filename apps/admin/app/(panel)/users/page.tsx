import { pageTitle } from "@/lib/page-title";
import { I18nProvider } from "@repo/i18n";
import { getLocaleConfig } from "@repo/i18n/config";
import { getLocale, getMessages } from "@repo/i18n/server";

import { UsersDirectory } from "../../../features/users/UsersDirectory";

export const generateMetadata = pageTitle("کاربران", "Users");

const Page = async () => {
  const [locale, { UserSettings }] = await Promise.all([getLocale(), getMessages()]);
  return (
    <I18nProvider locale={locale} messages={{ UserSettings }}>
      <div {...getLocaleConfig(locale)}>
        <UsersDirectory panel="admin" />
      </div>
    </I18nProvider>
  );
};
export default Page;
