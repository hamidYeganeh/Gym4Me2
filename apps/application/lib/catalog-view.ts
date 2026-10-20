import type {
  ClubDto,
  ClubSummaryDto,
  BranchProfileDto,
  MediaDto,
} from "@repo/api/catalog";
import type { ClubDetailData } from "@repo/ui/kit/ClubDetail";
import { getTranslator } from "@repo/i18n/messages";
import { clubHref } from "./club-href";
import { catalogInterval } from "./catalog-hours";

const placeholder = "/images/club-placeholder.svg";
export function catalogPhotos(
  media: (MediaDto | null | undefined)[],
  name: string,
): ClubDetailData["photos"] {
  const images = media.filter(
    (item): item is MediaDto => item?.type === "image",
  );
  const unique = images.filter(
    (item, index) =>
      images.findIndex((other) => other.url === item.url) === index,
  );
  const photos = unique.map((item) => ({
    src: item.url,
    alt: item.alt ?? name,
  }));
  return photos.length
    ? (photos as ClubDetailData["photos"])
    : [{ src: placeholder, alt: name }];
}
export function summaryView(
  club: ClubSummaryDto,
  locale: string,
): ClubDetailData {
  const t = getTranslator(locale);
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  return {
    id: club.id,
    href: clubHref(club.id, undefined, { branch: club.mainBranch.id }),
    name: club.name,
    category: club.categories.map((item) => item.name).join(" · "),
    categories: club.categories.map((item) => item.name),
    categoryIds: club.categories.map((item) => item.id),
    address: club.mainBranch.address ?? club.mainBranch.cityName ?? "",
    cityId: club.mainBranch.cityId,
    cityName: club.mainBranch.cityName,
    coordinates:
      club.mainBranch.longitude === null || club.mainBranch.latitude === null
        ? undefined
        : [club.mainBranch.longitude, club.mainBranch.latitude],
    price: club.startingTariff
      ? t("Tariffs.fromPrice", {
          amount: number.format(club.startingTariff.priceToman),
        })
      : t("Catalog.noTariff"),
    priceValue: club.startingTariff?.priceToman ?? null,
    pricePeriod: club.startingTariff
      ? t(`Tariffs.unit_${club.startingTariff.unit}`)
      : "",
    priceCurrency: t("Preview.toman"),
    locale,
    rating:
      club.rating.average === null
        ? t("Catalog.noRating")
        : number.format(club.rating.average),
    reviews: number.format(club.rating.count),
    photos: catalogPhotos([club.cover], club.name),
    facilities: [
      club.sports.map((item) => item.name).join(" · "),
      club.mainBranch.cityName ?? "",
      club.shortDescription ?? "",
    ],
    description: club.shortDescription ?? "",
    hours: "",
    distance: "",
    coachCount: 0,
    amenities: [],
  };
}
export function detailView(
  club: ClubDto,
  branch: BranchProfileDto | undefined,
  locale: string,
): ClubDetailData {
  const t = getTranslator(locale);
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const days = [
    "Catalog.day0",
    "Catalog.day1",
    "Catalog.day2",
    "Catalog.day3",
    "Catalog.day4",
    "Catalog.day5",
    "Catalog.day6",
  ] as const;
  const hours =
    branch?.openingHours.weekly
      .map(
        (row) =>
          `${t(days[row.dayOfWeek] ?? "Catalog.day0")} · ${t(`Catalog.audience_${row.audience}`)} · ${catalogInterval(row, locale)}`,
      )
      .join(" · ") ?? "";
  const tariff = club.tariffs
    .filter((item) => item.branchId === null || item.branchId === branch?.id)
    .sort((a, b) => a.priceToman - b.priceToman)[0];
  return {
    id: club.id,
    href: clubHref(club.id),
    name: club.name,
    logo: club.logo?.url,
    category: club.categories.map((item) => item.name).join(" · "),
    categories: club.categories.map((item) => item.name),
    categoryIds: club.categories.map((item) => item.id),
    address: branch?.location.address ?? "",
    cityId: branch?.location.cityId,
    coordinates: branch?.location.coordinates
      ? [branch.location.coordinates[1], branch.location.coordinates[0]]
      : undefined,
    price: tariff
      ? t("Tariffs.fromPrice", { amount: number.format(tariff.priceToman) })
      : t("Catalog.noTariff"),
    priceValue: tariff?.priceToman ?? null,
    pricePeriod: tariff ? t(`Tariffs.unit_${tariff.unit}`) : "",
    priceCurrency: t("Preview.toman"),
    locale,
    rating:
      club.rating.average === null
        ? t("Catalog.noRating")
        : number.format(club.rating.average),
    reviews: number.format(club.rating.count),
    photos: catalogPhotos(
      [club.cover, ...club.gallery, ...(branch?.gallery ?? [])],
      club.name,
    ),
    facilities: [
      club.sports.map((item) => item.name).join(" · "),
      branch?.name ?? "",
      club.shortDescription ?? "",
    ],
    description: club.description ?? "",
    hours,
    distance: "",
    coachCount: branch?.coaches.length ?? 0,
    amenities: (branch?.amenities ?? [])
      .filter((item) => item.availability !== "unavailable")
      .map((item) => ({
        id: item.id,
        label: item.name,
        description:
          item.description ??
          t(
            item.availability === "paid"
              ? "Catalog.paidAmenity"
              : "Catalog.includedAmenity",
          ),
      })),
  };
}
