import type {
  BranchProfileDto,
  ClubDto,
  ClubSummaryDto,
  MediaDto,
} from "@repo/api/catalog";
import { webFixtureId } from "./public-services";

/** Deterministic public metadata for visual QA; never a live gym or account. */
export function protectedCatalogFixtures() {
  const at = "2026-10-15T09:00:00.000Z";
  const category = { id: webFixtureId(2050), name: "باشگاه ورزشی نمایشی" };
  const sport = { id: webFixtureId(2051), name: "بدنسازی" };
  const branches: BranchProfileDto[] = [];
  const clubs: ClubDto[] = [0, 1].map((index) => {
    const id = webFixtureId(2001 + index),
      branchId = webFixtureId(2101 + index);
    const image: MediaDto = {
      id: webFixtureId(2201 + index),
      type: "image",
      url: `/images/clubs/${index ? "training" : "studio"}.png`,
      thumbnailUrl: null,
      alt: "فضای تمرین نمایشی برای بررسی طراحی",
      width: 1024,
      height: 1024,
      durationSeconds: null,
    };
    branches.push({
      id: branchId,
      clubId: id,
      name: "شعبهٔ مرکزی نمایشی",
      slug: `visual-branch-${index}`,
      timezone: "Asia/Tehran",
      isMain: true,
      operatingStatus: "active",
      archivedAt: null,
      createdAt: at,
      updatedAt: at,
      rules: "کفش مناسب تمرین همراه داشته باش.",
      visitInstructions: "پیش از شروع جلسه به پذیرش مراجعه کن.",
      audiencePolicies: {
        audiences: ["mixed"],
        minimumAge: 18,
        maximumAge: null,
        notes: null,
      },
      location: {
        address: "تهران، نشانی نمایشی برای بررسی رابط",
        coordinates: [35.8 + index / 100, 51.4],
        countryId: null,
        provinceId: null,
        cityId: null,
        districtId: null,
        neighborhood: null,
        cityZone: null,
      },
      sports: [sport],
      equipments: [
        {
          id: webFixtureId(2300),
          name: "وزنه و دستگاه",
          quantity: 12,
          description: "تجهیزات نمایشی",
        },
      ],
      amenities: [
        {
          id: webFixtureId(2301),
          name: "رختکن",
          availability: "included",
          description: "فضای تعویض لباس",
        },
      ],
      accessibilityFeatures: [],
      phones: [],
      gallery: [
        {
          ...image,
          id: webFixtureId(2251 + index),
          url: "/images/clubs/strength.png",
        },
      ],
      openingHours: {
        weekly: [
          {
            dayOfWeek: 0,
            audience: "mixed",
            startMinute: 480,
            endMinute: 1320,
          },
        ],
        exceptions: [],
      },
      spaces: [],
      coaches: [],
    });
    return {
      id,
      name: index ? "باشگاه نمایشی سپید" : "باشگاه نمایشی آفتاب",
      slug: `visual-club-${index}`,
      ownerId: webFixtureId(2400 + index),
      owner: { id: webFixtureId(2400 + index), displayName: "مالک نمایشی" },
      description:
        "این اطلاعات مصنوعی فقط برای بررسی حفظ طراحی کارت‌ها و صفحهٔ جزئیات باشگاه است. دادهٔ این صفحه، کاتالوگ واقعی یا امکان خرید ایجاد نمی‌کند.",
      shortDescription: "تمرین گروهی و بدنسازی در فضای نمایشی",
      publicationStatus: "published",
      verificationStatus: "verified",
      operatingStatus: "active",
      lastVerifiedAt: at,
      archivedAt: null,
      createdAt: at,
      updatedAt: at,
      logoId: null,
      coverId: image.id,
      logo: null,
      cover: image,
      categories: [category],
      sports: [sport],
      tags: [],
      phones: [],
      socials: [],
      gallery: [
        {
          ...image,
          id: webFixtureId(2261 + index),
          url: "/images/clubs/strength.png",
        },
      ],
      branches: [
        {
          id: branchId,
          name: "شعبهٔ مرکزی نمایشی",
          isMain: true,
          operatingStatus: "active",
          cityId: null,
        },
      ],
      rating: { average: 4.5, count: 12 },
      tariffs: [
        {
          id: webFixtureId(2501 + index),
          clubId: id,
          branchId: null,
          name: "جلسهٔ تمرین نمایشی",
          serviceType: "visit",
          priceToman: 150000 + index * 50000,
          unit: "visit",
          conditions: "تعرفهٔ مصنوعی برای بررسی نمایش تومان",
          isActive: true,
          versionId: webFixtureId(2551 + index),
          version: 1,
          currency: "IRT",
          effectiveFrom: at,
          createdAt: at,
        },
      ],
    } satisfies ClubDto;
  });
  const summaries: ClubSummaryDto[] = clubs.map((club) => {
    const branch = branches.find((b) => b.clubId === club.id)!;
    const tariff = club.tariffs[0]!;
    return {
      id: club.id,
      name: club.name,
      slug: club.slug,
      shortDescription: club.shortDescription,
      operatingStatus: club.operatingStatus,
      startingTariff: {
        priceToman: tariff.priceToman,
        unit: tariff.unit,
        serviceType: tariff.serviceType,
      },
      cover: club.cover,
      categories: club.categories,
      sports: club.sports,
      mainBranch: {
        id: branch.id,
        name: branch.name,
        address: branch.location.address,
        countryId: null,
        provinceId: null,
        cityId: null,
        cityName: "تهران",
        districtId: null,
        districtName: null,
        latitude: branch.location.coordinates![0],
        longitude: branch.location.coordinates![1],
      },
      rating: club.rating,
    };
  });
  return { clubs, branches, summaries, category, sport };
}
