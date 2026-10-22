import { SportsFrame } from "@repo/ui/sports";
import { AnalyticsPanel } from "@repo/ui/analytics";
import { getTranslations } from "@repo/i18n/server";
export default async function Page() {
  const t = await getTranslations("Analytics");
  return (
    <SportsFrame title={t("title")}>
      <AnalyticsPanel surface="business" />
    </SportsFrame>
  );
}
