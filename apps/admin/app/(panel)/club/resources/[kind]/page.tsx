import { notFound } from "next/navigation";

import { resourceKinds } from "@/features/clubs/resource-catalogs";
import { ResourceManager } from "@/features/clubs/ResourceManager";
import { I18nProvider } from "@repo/i18n";
import { getLocale, getMessages, getTranslations } from "@repo/i18n/server";

export const generateMetadata = async (props: { params: Promise<{ kind: string }> }) => {
  const { kind } = await props.params;
  const catalog = resourceKinds.find((entry) => entry === kind);
  const t = await getTranslations("Resources");
  return { title: t(catalog ?? "title") };
};

const Page = async (props: { params: Promise<{ kind: string }> }) => {
  const { kind } = await props.params;
  const catalog = resourceKinds.find((entry) => entry === kind);
  if (!catalog) notFound();
  const [locale, { Resources }] = await Promise.all([getLocale(), getMessages()]);
  return (
    <I18nProvider locale={locale} messages={{ Resources }}>
      <ResourceManager key={catalog} kind={catalog} />
    </I18nProvider>
  );
};

export default Page;
