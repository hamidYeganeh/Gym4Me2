"use client";
import { useTranslations } from "@repo/i18n";
import { ArrowUpRightIcon, Share2Icon } from "@repo/ui/icons";
import { Button } from "@repo/ui/kit/Button";
import { SocialIcon } from "@repo/ui/kit/SocialIcon";
import { useCatalogClub } from "./use-catalog";

export function ClubSocialShare({ clubId, onShare }: {
  clubId: string;
  onShare: () => void;
}) {
  const t = useTranslations("Social");
  const clubs = useTranslations("Clubs");
  const { data } = useCatalogClub(clubId);
  const links = (data?.socials ?? []).filter(({ link }) => {
    try { return ["https:", "http:"].includes(new URL(link).protocol); }
    catch { return false; }
  });
  if (!links.length) return null;
  return (
    <section className="flex flex-col gap-4" aria-label={t("profiles")}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">{t("profiles")}</h2>
        <Button variant="ghost" size="icon-sm" aria-label={clubs("share")} onClick={onShare}>
          <Share2Icon />
        </Button>
      </div>
      <div className="flex flex-col gap-3">
        {links.map(({ platform, link, label }) => (
          <Button key={`${platform}:${link}`} asChild variant="secondary" className="h-16 w-full gap-3">
            <a href={link} target="_blank" rel="noopener noreferrer">
              {platform === "instagram" || platform === "linkedin"
                ? <SocialIcon platform={platform} /> : <ArrowUpRightIcon />}
              <span>{label || (platform === "instagram" || platform === "linkedin" ? t(platform) : new URL(link).hostname)}</span>
            </a>
          </Button>
        ))}
      </div>
    </section>
  );
}
