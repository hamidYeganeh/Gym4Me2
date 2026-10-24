import { getTranslations } from "@repo/i18n/server";
import { TrainingPage } from "@repo/ui/training-page";
export default async function Training() {
  const t = await getTranslations("Training");
  return (
    <TrainingPage
      title={t("library")}
      description={t("libraryHint")}
      back={t("backToTraining")}
    />
  );
}
