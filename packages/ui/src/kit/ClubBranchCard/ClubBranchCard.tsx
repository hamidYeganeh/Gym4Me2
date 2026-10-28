"use client";
import Image from "next/image";
import { cn } from "../../lib/utils";
import { ArrowUpRightIcon as ArrowUpRight } from "../../icons";
import { Button } from "../Button";
import { clubBranchCardStyles as s } from "./ClubBranchCard.styles";
import type { ClubBranchCardProps } from "./ClubBranchCard.types";
export function ClubBranchCard({
  branch,
  viewLabel,
  onSelect,
  selected,
}: ClubBranchCardProps) {
  return (
    <article className={cn(s.root(), selected && "ring-2 ring-primary ring-inset")}>
      <Image
        src={branch.photo.src}
        alt={branch.photo.alt}
        fill
        sizes="144px"
        className="object-cover"
        unoptimized
      />
      <div className={s.overlay()} />
      <div className="absolute start-4 bottom-20 flex flex-col gap-1 [writing-mode:vertical-rl] rotate-180">
        <h3 className="rotate-180 text-xl font-semibold">{branch.name}</h3>
        <p className="text-xs text-image-foreground/75">{branch.address}</p>
      </div>
      {onSelect ? (
        <Button
          type="button"
          variant="image"
          size="icon-lg"
          className="absolute inset-0 h-full w-full rounded-[inherit] bg-transparent hover:bg-white/10 aria-pressed:bg-white/10 aria-pressed:text-white"
          onClick={onSelect}
          aria-pressed={selected}
          aria-label={`${viewLabel} · ${branch.name}`}
        >
          <span className="sr-only">{branch.name}</span>
        </Button>
      ) : (
        <Button
          asChild
          variant="image"
          size="icon-lg"
          className="absolute start-4 bottom-4"
        >
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${viewLabel} · ${branch.name}`}
          >
            <ArrowUpRight />
          </a>
        </Button>
      )}
    </article>
  );
}
