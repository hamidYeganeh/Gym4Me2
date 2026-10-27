"use client";
import Image from "next/image";
import { useTranslations } from "@repo/i18n";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@repo/ui/kit/Drawer";
import { Button } from "@repo/ui/kit/Button";
import { Bookmark, Copy, Share2, X, Send, MessageCircle } from "lucide-react";
import { toast } from "@repo/ui/kit/Sileo";
import { useClubUrl } from "./use-club-url";
import type { ClubDetailData } from "@repo/ui/kit/ClubDetail";
export function ClubShareSheet({
  club,
  branchId,
  open,
  onOpenChange,
  onShare,
  saved,
  onSavedChange,
}: {
  club: ClubDetailData;
  branchId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare: () => void;
  saved: boolean;
  onSavedChange: (saved: boolean) => void;
}) {
  const t = useTranslations("Clubs");
  const url = useClubUrl(club.id, branchId);
  async function copy() {
    if (!url) {
      toast.info(t("shareUnavailable"));
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("copied"));
    } catch {
      toast.error(t("shareFailed"));
    }
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-xl data-[vaul-drawer-direction=bottom]:max-h-[90dvh] data-[vaul-drawer-direction=bottom]:mt-0 pb-[calc(1.5rem+var(--app-safe-bottom))]">
        <DrawerHeader>
          <div className="flex items-center justify-between gap-3">
            <DrawerTitle>{t("shareTitle")}</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon-lg" aria-label={t("close")}>
                <X />
              </Button>
            </DrawerClose>
          </div>
          <DrawerDescription>{t("shareDescription")}</DrawerDescription>
        </DrawerHeader>
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-4 pb-2">
          <div className="relative aspect-[1200/630] shrink-0 overflow-hidden rounded-3xl bg-muted">
            <Image
              src={club.photos[0].src}
              alt={`${club.name} · ${club.category}`}
              fill
              sizes="544px"
              className="object-contain"
              unoptimized
            />
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-muted p-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{t("clubLink")}</p>
              <p dir="ltr" className="mt-1 truncate text-start text-sm">
                {url || t("shareUnavailable")}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon-lg"
              aria-label={t("copyLink")}
              onClick={() => void copy()}
            >
              <Copy />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => onSavedChange(!saved)}
              aria-pressed={saved}
            >
              <Bookmark data-icon="inline-start" />
              {saved ? t("unsave") : t("save")}
            </Button>
            <Button onClick={onShare}>
              <Share2 data-icon="inline-start" />
              {t("nativeShare")}
            </Button>
          </div>
          <div className="flex justify-around gap-3 pt-1">
            {[
              {
                name: "WhatsApp",
                Icon: MessageCircle,
                href: `https://wa.me/?text=${encodeURIComponent(`${club.name} ${url}`)}`,
              },
              {
                name: "Telegram",
                Icon: Send,
                href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(club.name)}`,
              },
              {
                name: "X",
                Icon: X,
                href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(club.name)}`,
              },
            ].map(({ name, Icon, href }) => (
              <div key={name} className="flex flex-col items-center gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="icon-lg"
                  disabled={!url}
                >
                  <a
                    href={url ? href : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${t("share")} · ${name}`}
                    aria-disabled={!url}
                  >
                    <Icon />
                  </a>
                </Button>
                <span className="text-xs text-muted-foreground">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
