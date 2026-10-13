import { getTranslations } from "@repo/i18n/server";
import { AccountWorkspace } from "@repo/ui/account";
export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("Copy.categories") };
}
export default function Page() {
  return <AccountWorkspace client="admin" section="taxonomies" />;
}
