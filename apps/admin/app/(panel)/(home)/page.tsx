import { HomeView } from "@/features/home/views/HomeView";
import { pageTitle } from "@/lib/page-title";
import { I18nProvider } from "@repo/i18n";
import { getLocale, getMessages } from "@repo/i18n/server";

export const generateMetadata = pageTitle("داشبورد", "Dashboard");

const Page = async () => {
  const [locale, { DashboardGeography }] = await Promise.all([getLocale(), getMessages()]);
  return (
    <I18nProvider locale={locale} messages={{ DashboardGeography }}>
      <HomeView />
    </I18nProvider>
  );
};

export default Page;
