"use client";
import { useMediaPreview } from "@repo/api/catalog";
import { useTranslations } from "@repo/i18n";
import { Button } from "@repo/ui/kit/Button";
export function MediaLink({ clubId, mediaId, label }: { clubId: string; mediaId: string; label: string }) {
  const query = useMediaPreview(clubId, mediaId);
  const t = useTranslations("Catalog");
  if (query.isError) return <Button variant="ghost" onClick={() => void query.refetch()}>{t("retry")}</Button>;
  if (!query.data) return <span className="text-sm text-muted-foreground">{t("loading")}</span>;
  return <a className="truncate text-sm underline" href={query.data.url} target="_blank" rel="noopener noreferrer">{label}</a>;
}
