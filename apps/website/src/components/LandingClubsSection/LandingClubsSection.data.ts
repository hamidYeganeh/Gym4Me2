import { getTranslator } from "@repo/i18n/messages";
import type { LandingClub } from "./LandingClubsSection.types";

// The same illustrative club fixtures as the application; not a live catalog.
const records = [
  {
    id: "atlas",
    name: "atlasAthleticClub",
    area: "zaferaniehTehran",
    category: "strengthConditioning",
    price: 450000,
    rating: 4.8,
    reviews: 124,
    trainers: 12,
    space: 1200,
    image: "strength",
  },
  {
    id: "forma",
    name: "formaFitnessStudio",
    area: "niavaranTehran",
    category: "movementCardio",
    price: 350000,
    rating: 4.9,
    reviews: 86,
    trainers: 8,
    space: 850,
    image: "studio",
  },
  {
    id: "pulse",
    name: "pulseTrainingClub",
    area: "velenjakTehran",
    category: "functionalTraining",
    price: 400000,
    rating: 4.7,
    reviews: 98,
    trainers: 10,
    space: 1000,
    image: "training",
  },
  {
    id: "zenith",
    name: "zenithFitness",
    area: "zaferaniehTehran",
    category: "strengthConditioning",
    price: 420000,
    rating: 4.6,
    reviews: 72,
    trainers: 7,
    space: 900,
    image: "strength",
  },
  {
    id: "nova",
    name: "novaMovementStudio",
    area: "niavaranTehran",
    category: "movementCardio",
    price: 320000,
    rating: 4.7,
    reviews: 58,
    trainers: 6,
    space: 700,
    image: "studio",
  },
] as const;

export function getLandingClubs(locale: string): readonly LandingClub[] {
  const t = getTranslator(locale);
  const number = new Intl.NumberFormat(locale);
  return records.map((item) => {
    const name = t(`Preview.${item.name}`);
    const address = t(`Preview.${item.area}`);
    const category = t(`Preview.${item.category}`);
    const image = `/images/clubs/${item.image}.webp`;
    return {
      id: item.id,
      title: name,
      titleLines: [name],
      region: category,
      description: t("Website.clubs.description"),
      coordinates: address,
      image,
      thumbnail: image,
      href: "#classes",
      club: {
        id: item.id,
        href: "#clubs",
        name,
        address,
        category,
        price: t("Preview.priceAmount", { amount: item.price }),
        pricePeriod: t("Preview.visit"),
        rating: number.format(item.rating),
        reviews: number.format(item.reviews),
        photos: [{ src: image, alt: name }],
        facilities: [
          t("Preview.proEquipment"),
          t("Preview.trainerCount", { count: item.trainers }),
          t("Preview.spaceArea", { area: item.space }),
        ],
      },
    };
  });
}
