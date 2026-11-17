import { I18nProvider } from "@repo/i18n";
import { getLocaleConfig } from "@repo/i18n/config";
import { getLocale, getMessages } from "@repo/i18n/server";

import { UserSettings } from "../../../../features/users/UserSettings";

const Page = async (props: PageProps<"/users/[userId]">) => {
  const { params } = props;
  const [{ userId }, locale, { UserSettings: messages }] = await Promise.all([
    params,
    getLocale(),
    getMessages(),
  ]);
  return (
    <I18nProvider timeZone="UTC" locale={locale} messages={{ UserSettings: messages }}>
      <div {...getLocaleConfig(locale)}>
        <UserSettings key={userId} userId={userId} panel="business" />
      </div>
    </I18nProvider>
  );
};

export default Page;
