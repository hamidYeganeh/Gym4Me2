import { getTranslations } from "@repo/i18n/server";
import { AccountWorkspace } from "@repo/ui/account";
export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("Copy.branchRecord") };
}
export default async function Page({
  params,
}: {
  params: Promise<{ organizationId: string; branchId: string }>;
}) {
  const { organizationId, branchId } = await params;
  return (
    <AccountWorkspace
      client="admin"
      section="organizations"
      entityId={organizationId}
      branchId={branchId}
    />
  );
}
