"use client";

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useLocale, useTranslations } from "@repo/i18n";
import {
  useLocationDiscovery,
  useClubs,
  type DiscoveryLocationDto,
  type DiscoveryPlaceDto,
} from "@repo/api/catalog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "../Carousel";
import { LocationCard } from "../LocationCard";
import { Skeleton } from "../Skeleton";
import { FitnessIllustration } from "../FitnessIllustration";
import { locationCover } from "../../lib/location-cover";
import { chooseDiscoveryLocation } from "../../lib/discovery-location";
import { cn } from "../../lib/utils";
import { useFeedbackToast } from "../../hooks/use-feedback-toast";

// One seed per browser visit. The server snapshot avoids random values in the
// prerendered shell; hydration reads the cached browser snapshot afterward.
let visitSeed: string | undefined;
const subscribeSeed = () => () => {};
const serverSeed = () => undefined;
const browsingSeed = () => (visitSeed ??= crypto.randomUUID());

export function LocationExplorer({
  value = {},
  randomize = false,
  ready = true,
  onChange,
  saving = false,
  className,
  afterRows,
  linkToPlace,
}: {
  linkToPlace?: (
    kind: "provinces" | "cities" | "districts",
    place: DiscoveryPlaceDto,
  ) => string;
  value?: DiscoveryLocationDto;
  randomize?: boolean;
  ready?: boolean;
  onChange: (value: DiscoveryLocationDto) => void;
  saving?: boolean;
  className?: string;
  afterRows?: Partial<Record<"provinces" | "cities" | "districts", ReactNode>>;
}) {
  const t = useTranslations("LocationDiscovery");
  const locale = useLocale();
  const seed = useSyncExternalStore(subscribeSeed, browsingSeed, serverSeed);
  const enabled = ready && (!randomize || Boolean(seed));
  const query = useLocationDiscovery(
    { ...value, randomize, seed: randomize ? seed : "saved" },
    enabled,
  );
  const data = enabled ? query.data : undefined;
  useFeedbackToast("error", t("error"), enabled ? query.error : null);
  const province = data?.provinces.find(
    (item) => item.id === data.location.provinceId,
  );
  const city = data?.cities.find((item) => item.id === data.location.cityId);
  const rows = [
    {
      kind: "provinces",
      title: t("provinces"),
      items: data?.provinces,
      selected: data?.location.provinceId,
      parent: value.countryId,
    },
    {
      kind: "cities",
      title: province ? t("citiesIn", { name: province.name }) : t("cities"),
      items: data?.cities,
      selected: data?.location.cityId,
      parent: data?.location.provinceId,
    },
    {
      kind: "districts",
      title: city ? t("districtsIn", { name: city.name }) : t("districts"),
      items: data?.districts,
      selected: data?.location.districtId,
      parent: data?.location.cityId,
    },
  ] as const;
  const loading = !enabled || query.isPending;
  return (
    <div
      data-slot="location-explorer"
      className={cn("grid min-w-0 gap-7", className)}
      aria-busy={loading || saving}
    >
      {query.isError && enabled ? (
        <>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted p-4 text-sm">
            <button
              type="button"
              className="min-h-11 rounded-full border px-4"
              onClick={() => void query.refetch()}
            >
              {t("retry")}
            </button>
          </div>
          {afterRows?.provinces}
          {afterRows?.cities}
          {afterRows?.districts}
        </>
      ) : (
        rows.map((row) => (
          <Fragment key={`${row.kind}-${row.parent ?? ""}-${locale}`}>
            <Carousel
              opts={{
                direction: locale === "fa" ? "rtl" : "ltr",
                align: "start",
              }}
              aria-label={row.title}
              className="min-w-0"
            >
              <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
                <h3 className="text-base font-semibold">{row.title}</h3>
                <div className="flex shrink-0 gap-2">
                  <CarouselPrevious className="static! size-9! min-h-9! translate-none!" />
                  <CarouselNext className="static! size-9! min-h-9! translate-none!" />
                </div>
              </div>
              {loading ? (
                <div
                  className="flex gap-3 overflow-hidden"
                  role="status"
                  aria-label={t("loading")}
                >
                  {[0, 1, 2].map((index) => (
                    <Skeleton
                      key={index}
                      className="aspect-[129/153] w-[44%] shrink-0 rounded-3xl"
                    />
                  ))}
                </div>
              ) : row.items?.length ? (
                <CarouselContent className="-ms-3!">
                  {row.items.map((place: DiscoveryPlaceDto) => (
                    <CarouselItem
                      key={place.id}
                      className="basis-[46%]! ps-3! sm:basis-[40%]!"
                    >
                      <PlaceCard
                        place={place}
                        kind={row.kind}
                        name={place.name}
                        parent={place.parentName}
                        {...locationCover(place.name)}
                        clubCount={place.clubCount}
                        kindLabel={t(`kind.${row.kind}`)}
                        className="w-full!"
                        href={linkToPlace?.(row.kind, place)}
                        selected={!linkToPlace && row.selected === place.id}
                        selectionProps={{
                          "aria-pressed": row.selected === place.id,
                          disabled: saving,
                        }}
                        onSelect={() =>
                          onChange(chooseDiscoveryLocation(row.kind, place))
                        }
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              ) : (
                <div className="flex items-center gap-4 rounded-2xl bg-muted p-5 text-sm text-muted-foreground">
                  <FitnessIllustration kind="jumpRope" size="sm" />
                  <p>{t("empty")}</p>
                </div>
              )}
            </Carousel>
            {afterRows?.[row.kind]}
          </Fragment>
        ))
      )}
      <a
        href="/images/locations/credits.txt"
        target="_blank"
        rel="noreferrer"
        className="text-xs text-muted-foreground underline underline-offset-4"
      >
        {t("photoCredits")}
      </a>
    </div>
  );
}

function PlaceCard({
  place,
  kind,
  ...props
}: React.ComponentProps<typeof LocationCard> & {
  place: DiscoveryPlaceDto;
  kind: "provinces" | "cities" | "districts";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const query = useClubs(
    chooseDiscoveryLocation(kind, place),
    false,
    undefined,
    visible && place.clubCount > 0,
  );
  return (
    <div ref={ref}>
      <LocationCard
        {...props}
        clubs={(query.data ?? []).slice(0, 3).map((club) => ({
          id: club.id,
          name: club.name,
          image: club.cover?.url ?? "",
        }))}
      />
    </div>
  );
}
