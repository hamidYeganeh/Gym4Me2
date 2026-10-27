"use client";
import { Share2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "@repo/i18n";
import { Button } from "@repo/ui/kit/Button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/kit/Card";
import { SocialIcon, type SocialPlatform } from "@repo/ui/kit/SocialIcon";
import { toast } from "@repo/ui/kit/Sileo";
import { useClubUrl } from "./use-club-url";
import { useCatalogClub } from "./use-catalog";

export function ClubSocialShare({
  clubId,
  onShare,
}: {
  clubId: string;
  onShare: () => void;
}) {
  const t = useTranslations("Social");
  const clubs = useTranslations("Clubs");
  const params = useSearchParams();
  const { selectedBranchId } = useCatalogClub(
    clubId,
    params.get("branch") ?? undefined,
  );
  const url = useClubUrl(clubId, selectedBranchId);
  const platforms: SocialPlatform[] = ["facebook", "instagram", "linkedin"];
  async function copyInstagram() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("instagramCopied"));
    } catch {
      toast.error(clubs("shareFailed"));
    }
  }
  return (
    <section aria-label={t("title")}>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="uppercase tracking-widest">{t("title")}</h2>
          </CardTitle>
          <CardAction>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={clubs("share")}
              onClick={onShare}
            >
              <Share2 />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {platforms.map((platform) => {
            const label = t("shareOn", { platform: t(platform) });
            const icon = <SocialIcon platform={platform} />;
            if (platform === "instagram" || !url)
              return (
                <Button
                  key={platform}
                  variant="secondary"
                  className="h-16 w-full"
                  aria-label={label}
                  disabled={!url}
                  onClick={() => void copyInstagram()}
                >
                  {icon}
                </Button>
              );
            const href =
              platform === "facebook"
                ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
                : `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
            return (
              <Button
                key={platform}
                asChild
                variant="secondary"
                className="h-16 w-full"
              >
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                >
                  {icon}
                </a>
              </Button>
            );
          })}
        </CardContent>
      </Card>
    </section>
  );
}
