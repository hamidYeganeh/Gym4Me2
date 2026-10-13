import { getTranslations } from "@repo/i18n/server";
import { AccountWorkspace } from "@repo/ui/account";
export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("Copy.publicationQueue") };
}
export default function Page() {
  return <AccountWorkspace client="admin" section="catalog-reviews" />;
}
