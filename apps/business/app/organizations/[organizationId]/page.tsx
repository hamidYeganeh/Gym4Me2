import { AccountWorkspace } from "@repo/ui/account";
import { getTranslations } from "@repo/i18n/server";
export async function generateMetadata() {
  const t = await getTranslations("BusinessCatalog");
  return { title: t("clubProfile") };
}
export default async function Page({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  return (
    <AccountWorkspace
      client="business"
      section="organizations"
      entityId={organizationId}
    />
  );
}
