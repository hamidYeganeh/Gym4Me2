import { getTranslations } from "@repo/i18n/server";
import { TrainingPage } from "@repo/ui/training-page";
export default async function Training() {
  const t = await getTranslations("Home");
  return <TrainingPage title={t("dialog")} description={t("dialogDescription")} back={t("back")} />;
}
