import { ResourceDirectory } from "@/features/clubs/ResourceDirectory";
import { I18nProvider } from "@repo/i18n";
import { getLocale, getMessages, getTranslations } from "@repo/i18n/server";

export const generateMetadata = async () => {
  const t = await getTranslations("Resources");
  return { title: t("title") };
};

const Page = async () => {
  const [locale, { Resources }] = await Promise.all([getLocale(), getMessages()]);
  return (
    <I18nProvider locale={locale} messages={{ Resources }}>
      <ResourceDirectory />
    </I18nProvider>
  );
};

export default Page;
