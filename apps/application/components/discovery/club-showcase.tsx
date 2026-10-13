"use client";
import { useTranslations } from "@repo/i18n";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@repo/ui/kit/Dialog";
import Image from "next/image";
import Link from "next/link";
import { Carousel, CarouselContent, CarouselItem } from "@repo/ui/kit/Carousel";
import { Badge } from "@repo/ui/kit/Badge";
import { Button } from "@repo/ui/kit/Button";
import type { ClubDetailData } from "@repo/ui/kit/ClubDetail";
export function ClubShowcase({
  club,
  locale,
  viewLabel,
}: {
  club: ClubDetailData;
  locale: string;
  viewLabel: string;
}) {
  const copy = useTranslations();

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const openedFrom = useRef(0);
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);
  const fa = locale === "fa";
  const photo = club.photos[selected];
  const move = (step: number) =>
    setSelected(
      (index) => (index + step + club.photos.length) % club.photos.length,
    );
  const cover = club.photos[0];
  if (!cover) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <article className="flex min-w-0 flex-col gap-4" aria-label={club.name}>
        <Carousel
          opts={{ align: "start", direction: locale === "fa" ? "rtl" : "ltr" }}
          aria-label={club.name}
          tabIndex={0}
        >
          <CarouselContent>
            {club.photos.map((photo, index) => (
              <CarouselItem key={photo.src} className="basis-auto">
                <button
                  type="button"
                  ref={(element) => {
                    triggers.current[index] = element;
                  }}
                  aria-label={copy("Copy.galleryPhotoLabel", {
                    alt: photo.alt,
                  })}
                  onClick={() => {
                    openedFrom.current = index;
                    setSelected(index);
                    setOpen(true);
                  }}
                  className={
                    index === 0
                      ? "relative aspect-video h-45 overflow-hidden rounded-2xl bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      : "relative aspect-[9/16] h-45 overflow-hidden rounded-2xl bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  }
                >
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes={index === 0 ? "320px" : "102px"}
                    className="object-cover"
                    unoptimized
                  />
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        <div className="flex items-center gap-3">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-muted">
            <Image
              src={club.logo ?? cover.src}
              alt=""
              fill
              sizes="56px"
              className={club.logo ? "object-contain" : "object-cover"}
              unoptimized
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h2 className="text-base font-semibold leading-6">{club.name}</h2>
            <ul className="flex flex-wrap gap-1.5" aria-label={club.category}>
              {(club.categories ?? [club.category]).map((category) => (
                <li key={category}>
                  <Badge variant="secondary">{category}</Badge>
                </li>
              ))}
            </ul>
          </div>
          <Button asChild variant="outline">
            <Link
              href={club.href ?? `/discovery/clubs/${club.id}`}
              scroll={false}
              aria-label={`${viewLabel} ${club.name}`}
            >
              {viewLabel}
            </Link>
          </Button>
        </div>
      </article>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100%-2rem)] max-w-xl gap-4 rounded-3xl p-4"
        dir={fa ? "rtl" : "ltr"}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggers.current[openedFrom.current]?.focus();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            move(event.key === "ArrowRight" ? (fa ? -1 : 1) : fa ? 1 : -1);
          }
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <DialogTitle>{club.name}</DialogTitle>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label={copy("Copy.closeGallery")}
            >
              <X />
            </Button>
          </DialogClose>
        </div>
        <DialogDescription className="sr-only">
          {copy("Copy.clubPhotos")}
        </DialogDescription>
        {photo && (
          <div className="relative aspect-[4/3] max-h-[60dvh] overflow-hidden rounded-2xl bg-muted">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="576px"
              className="object-contain"
              unoptimized
            />
          </div>
        )}
        <div className="flex items-center justify-between gap-3" dir="ltr">
          <Button
            variant="secondary"
            size="icon-lg"
            onClick={() => move(-1)}
            aria-label={copy("Copy.previousPhoto")}
          >
            <ChevronLeft />
          </Button>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {new Intl.NumberFormat(locale).format(selected + 1)} /{" "}
            {new Intl.NumberFormat(locale).format(club.photos.length)}
          </p>
          <Button
            variant="secondary"
            size="icon-lg"
            onClick={() => move(1)}
            aria-label={copy("Copy.nextPhoto")}
          >
            <ChevronRight />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
