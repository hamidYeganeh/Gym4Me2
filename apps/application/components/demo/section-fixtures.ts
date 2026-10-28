import type { BranchProfileDto, TariffDto } from "@repo/api/catalog";
import { getClubs } from "../../lib/clubs";

export const demoClubs = getClubs("fa").map((club) => ({
  ...club,
  href: "/demo?category=fitness#demo-ClubDetail",
}));

const updatedAt = "2026-10-28T08:00:00+03:30";

export const demoBranch: BranchProfileDto = {
  id: "demo-branch",
  clubId: "atlas",
  name: "شعبهٔ مرکزی",
  slug: "demo-central",
  timezone: "Asia/Tehran",
  isMain: true,
  operatingStatus: "active",
  archivedAt: null,
  createdAt: updatedAt,
  updatedAt,
  rules: "همراه‌داشتن لباس ورزشی و حوله الزامی است.",
  visitInstructions: "ده دقیقه قبل از شروع جلسه در پذیرش حاضر باش.",
  audiencePolicies: {
    audiences: ["all"],
    minimumAge: 16,
    maximumAge: null,
    notes: "اطلاعات این شعبه برای نمایش کامپوننت‌هاست.",
  },
  location: {
    address: "تهران، زعفرانیه · آدرس نمونه",
    coordinates: null,
    countryId: null,
    provinceId: null,
    cityId: null,
    districtId: null,
    neighborhood: "زعفرانیه",
    cityZone: "north",
  },
  sports: [
    { id: "strength", name: "بدنسازی" },
    { id: "fitness", name: "آمادگی جسمانی" },
  ],
  equipments: [
    {
      id: "dumbbells",
      name: "دمبل",
      quantity: 20,
      description: "وزنه‌های سبک تا سنگین",
    },
  ],
  amenities: [
    {
      id: "showers",
      name: "دوش و رختکن",
      availability: "included",
      description: null,
    },
  ],
  accessibilityFeatures: [
    { id: "elevator", name: "آسانسور", description: "دسترسی به طبقهٔ سالن" },
  ],
  phones: [],
  gallery: [],
  openingHours: {
    weekly: Array.from({ length: 6 }, (_, dayOfWeek) => ({
      dayOfWeek,
      audience: "all",
      startMinute: 360,
      endMinute: 1380,
    })),
    exceptions: [
      {
        date: "2026-10-30",
        audience: "all",
        isClosed: true,
        reason: "تعطیلی نمونه برای سرویس تجهیزات",
        intervals: [],
      },
    ],
  },
  spaces: [],
  coaches: [],
};

export const demoTariffs: TariffDto[] = [
  {
    id: "demo-visit",
    clubId: "atlas",
    branchId: demoBranch.id,
    name: "ورود تک‌جلسه‌ای",
    serviceType: "visit",
    priceToman: 450000,
    unit: "visit",
    conditions: "یک نوبت استفاده از سالن؛ تعرفهٔ نمایشی.",
    includedServices: ["سالن بدنسازی", "رختکن"],
    isActive: true,
    versionId: "demo-visit-v1",
    version: 1,
    currency: "IRT",
    effectiveFrom: updatedAt,
    createdAt: updatedAt,
  },
  {
    id: "demo-monthly",
    clubId: "atlas",
    branchId: demoBranch.id,
    name: "عضویت ماهانه",
    serviceType: "membership",
    priceToman: 2800000,
    unit: "month",
    durationDays: 30,
    sessionCount: 12,
    conditions: "رزرو قبلی برای هر جلسه لازم است؛ تعرفهٔ نمایشی.",
    includedServices: ["۱۲ جلسهٔ تمرین", "ارزیابی اولیه"],
    isActive: true,
    versionId: "demo-monthly-v1",
    version: 1,
    currency: "IRT",
    effectiveFrom: updatedAt,
    createdAt: updatedAt,
  },
];
