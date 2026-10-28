"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@repo/ui/kit/Dialog";
import { useTranslations } from "@repo/i18n";
import {
  Copy1Icon as Copy,
  ChatIcon as MessageCircle,
  PaperPlaneDiagonalIcon as Send,
  Share2Icon as Share2,
  CloseXIcon as X,
} from "@repo/ui/icons";
import { Button } from "@repo/ui/kit/Button";
import type { ClubDetailData } from "@repo/ui/kit/ClubDetail";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@repo/ui/kit/Drawer";
import { Like } from "@repo/ui/kit/Like";
import { toast } from "@repo/ui/kit/Sileo";
import Image from "next/image";
import { useClubUrl } from "./use-club-url";
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
  const [fullscreen, setFullscreen] = useState(false);
  const url = useClubUrl(club.slug ?? club.id, branchId);
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
          <button
            type="button"
            aria-label={t("viewFullscreen")}
            onClick={() => setFullscreen(true)}
            className="relative aspect-[1200/630] w-full shrink-0 cursor-zoom-in overflow-hidden rounded-3xl focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Image
              src={club.photos[0].src}
              alt={`${club.name} · ${club.category}`}
              fill
              sizes="544px"
              className="object-cover"
              unoptimized
            />
          </button>
          <Dialog open={fullscreen} onOpenChange={setFullscreen}>
            <DialogContent
              className="club-image-fullscreen !translate-x-0 !translate-y-0 rtl:!translate-x-0 !bg-[#101113]"
              aria-describedby={undefined}
            >
              <DialogTitle className="sr-only">{club.name}</DialogTitle>
              <DialogDescription className="sr-only">
                {t("viewFullscreen")}
              </DialogDescription>
              <Image
                src={club.photos[0].src}
                alt={`${club.name} · ${club.category}`}
                fill
                sizes="100vw"
                className="object-contain"
                unoptimized
              />
            </DialogContent>
          </Dialog>
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
            <Like
              variant="outline"
              onClick={() => onSavedChange(!saved)}
              aria-pressed={saved}
            >
              {saved ? t("unsave") : t("save")}
            </Like>
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
