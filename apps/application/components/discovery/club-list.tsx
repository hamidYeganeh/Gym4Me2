"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";
import type { ClubDetailData } from "@repo/ui/kit/ClubDetail";
export function ClubList({
  clubs,
  title,
  viewLabel,
}: {
  clubs: ClubDetailData[];
  title: string;
  viewLabel: string;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <ul className="flex flex-col gap-4">
        {clubs.slice(0, 5).map((club) => (
          <li key={club.id}>
            <Link
              href={`/discovery/clubs/${club.id}`}
              scroll={false}
              aria-label={`${viewLabel} · ${club.name}`}
              className="flex items-center gap-4 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-muted">
                <Image
                  src={club.photos[0].src}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized
                />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <h3 className="text-base font-semibold">{club.name}</h3>
                <p className="text-xs text-muted-foreground">{club.address}</p>
                <p className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {club.price} / {club.pricePeriod}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="size-3 text-rating" fill="currentColor" />
                    {club.rating}
                  </span>
                </p>
              </div>
              <ArrowUpRight className="size-5 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
