import { AccountWorkspace } from "@repo/ui/account";
import { getTranslations } from "@repo/i18n/server";
export async function generateMetadata() {
  const t = await getTranslations("BusinessCatalog");
  return { title: t("branchProfile") };
}
export default async function Page({
  params,
}: {
  params: Promise<{ organizationId: string; branchId: string }>;
}) {
  const { organizationId, branchId } = await params;
  return (
    <AccountWorkspace
      client="business"
      section="organizations"
      entityId={organizationId}
      branchId={branchId}
    />
  );
}
