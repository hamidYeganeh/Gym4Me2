import { Suspense } from "react";
import { SportsHostConversations } from "@repo/ui/sports-messages";
import { getTranslations } from "@repo/i18n/server";

export default async function Page() {
  const t = await getTranslations("Luma");
  return (
    <Suspense
      fallback={
        <p role="status" className="p-8">
          {t("loading")}
        </p>
      }
    >
      <SportsHostConversations />
    </Suspense>
  );
}
