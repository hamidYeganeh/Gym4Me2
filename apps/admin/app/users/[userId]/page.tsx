import { getTranslations } from "@repo/i18n/server";
import { AccountWorkspace } from "@repo/ui/account";
export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("Copy.userRecord") };
}
export default async function Page({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <AccountWorkspace client="admin" section="users" entityId={userId} />;
}
