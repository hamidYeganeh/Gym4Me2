"use client";
import {
  useDiscoveryContent,
  type DiscoveryPage,
  type DiscoveryContent,
} from "@repo/api/catalog";
import { useLocale } from "@repo/i18n";
import Link from "next/link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./kit/Carousel";
function Slide({
  slide,
  ratio,
}: {
  slide: DiscoveryContent["slides"][number];
  ratio: string;
}) {
  const body = (
    <>
      <img
        src={slide.image}
        alt={slide.title}
        loading="lazy"
        className="w-full rounded-2xl bg-muted object-cover"
        style={{ aspectRatio: ratio }}
      />
      {slide.title && <h3 className="pt-3 font-semibold">{slide.title}</h3>}
      {slide.subtitle && (
        <p className="pt-1 text-sm text-muted-foreground">{slide.subtitle}</p>
      )}
    </>
  );
  return slide.href ? (
    <Link href={slide.href} className="block">
      {body}
    </Link>
  ) : (
    <div>{body}</div>
  );
}
export function DiscoveryContentSections({ page }: { page: DiscoveryPage }) {
  const query = useDiscoveryContent(page);
  const locale = useLocale();
  return (
    <>
      {query.data?.map(({ id, config }) => (
        <section
          key={id}
          className="min-w-0 space-y-4"
          aria-label={config.title}
        >
          <header className="space-y-1">
            <h2 className="text-xl font-semibold">{config.title}</h2>
            {config.subtitle && (
              <p className="text-sm text-muted-foreground">{config.subtitle}</p>
            )}
          </header>
          {config.carouselType === "carousel" ? (
            <Carousel
              opts={{
                direction: locale === "fa" ? "rtl" : "ltr",
                align: "start",
              }}
            >
              <CarouselContent>
                {config.slides.map((slide, index) => (
                  <CarouselItem
                    key={index}
                    className="basis-[85%] sm:basis-2/3"
                  >
                    <Slide slide={slide} ratio={config.imageRatio} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              {config.slides.length > 1 && (
                <div className="mt-3 flex justify-end gap-2">
                  <CarouselPrevious className="static translate-y-0" />
                  <CarouselNext className="static translate-y-0" />
                </div>
              )}
            </Carousel>
          ) : (
            <div
              className={
                config.carouselType === "grid"
                  ? "grid grid-cols-2 gap-4"
                  : undefined
              }
            >
              {(config.carouselType === "single"
                ? config.slides.slice(0, 1)
                : config.slides
              ).map((slide, index) => (
                <Slide key={index} slide={slide} ratio={config.imageRatio} />
              ))}
            </div>
          )}
        </section>
      ))}
    </>
  );
}
