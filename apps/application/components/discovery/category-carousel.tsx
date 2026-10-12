"use client";
import Image from "next/image";
import Link from "next/link";
import { Carousel, CarouselContent, CarouselItem } from "@repo/ui/kit/Carousel";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/kit/ToggleGroup";
export const categoryForClub: Record<string, string> = {
  atlas: "strength",
  forma: "movement",
  pulse: "functional",
  zenith: "strength",
  nova: "movement",
};
export function CategoryCarousel({
  locale,
  selected = "",
  onSelect,
  clubId,
}: {
  locale: string;
  selected?: string;
  onSelect?: (value: string) => void;
  clubId?: string;
}) {
  const fa = locale === "fa";
  const categories = [
    { id: "strength", name: fa ? "قدرتی" : "Strength", image: "strength" },
    { id: "movement", name: fa ? "هوازی" : "Cardio", image: "studio" },
    {
      id: "group",
      name: fa ? "تمرین گروهی" : "Group training",
      image: "studio",
    },
    {
      id: "functional",
      name: fa ? "فانکشنال" : "Functional",
      image: "training",
    },
  ];
  const items = categories;
  const card = (category: (typeof categories)[number]) => (
    <>
      <span className="relative block aspect-square w-full overflow-hidden rounded-2xl bg-muted">
        <Image
          src={`/images/clubs/${category.image}.png`}
          alt=""
          fill
          sizes="112px"
          className="object-cover"
          unoptimized
        />
      </span>
      <span className="text-sm font-medium">{category.name}</span>
    </>
  );
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className="text-xl font-semibold">
        {fa ? "دسته‌بندی‌های باشگاه" : "Club categories"}
      </h2>
      <Carousel
        opts={{ align: "start", direction: fa ? "rtl" : "ltr" }}
        aria-label={fa ? "دسته‌بندی‌ها" : "Categories"}
      >
        <ToggleGroup
          type="single"
          value={selected || (clubId ? categoryForClub[clubId] : "")}
          onValueChange={onSelect}
          asChild
        >
          <CarouselContent>
            {items.map((category) => (
              <CarouselItem key={category.id} className="basis-1/3">
                <div className="flex flex-col gap-2">
                  {onSelect ? (
                    <ToggleGroupItem
                      value={category.id}
                      className="h-auto w-full flex-col gap-2 rounded-2xl p-2"
                      aria-label={category.name}
                    >
                      {card(category)}
                    </ToggleGroupItem>
                  ) : (
                    <Link
                      href={`/discovery?category=${category.id}`}
                      className="flex flex-col gap-2 rounded-2xl p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      scroll={false}
                    >
                      {card(category)}
                    </Link>
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </ToggleGroup>
      </Carousel>
    </section>
  );
}
