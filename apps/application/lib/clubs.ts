import { getTranslator } from "@repo/i18n/messages";
import type { ClubDetailData } from "@repo/ui/kit/ClubDetail";

const records = [
  {
    id: "atlas",
    name: "Preview.atlasAthleticClub",
    area: "Preview.zaferaniehTehran",
    category: "Preview.strengthConditioning",
    price: 450000,
    rating: 4.8,
    reviews: 124,
    trainers: 12,
    space: 1200,
    distance: 1.2,
    image: "strength",
  },
  {
    id: "forma",
    name: "Preview.formaFitnessStudio",
    area: "Preview.niavaranTehran",
    category: "Preview.movementCardio",
    price: 350000,
    rating: 4.9,
    reviews: 86,
    trainers: 8,
    space: 850,
    distance: 2.4,
    image: "studio",
  },
  {
    id: "pulse",
    name: "Preview.pulseTrainingClub",
    area: "Preview.velenjakTehran",
    category: "Preview.functionalTraining",
    price: 400000,
    rating: 4.7,
    reviews: 98,
    trainers: 10,
    space: 1000,
    distance: 3.1,
    image: "training",
  },
  {
    id: "zenith",
    name: "Preview.zenithFitness",
    area: "Preview.zaferaniehTehran",
    category: "Preview.strengthConditioning",
    price: 420000,
    rating: 4.6,
    reviews: 72,
    trainers: 7,
    space: 900,
    distance: 1.5,
    image: "strength",
  },
  {
    id: "nova",
    name: "Preview.novaMovementStudio",
    area: "Preview.niavaranTehran",
    category: "Preview.movementCardio",
    price: 320000,
    rating: 4.7,
    reviews: 58,
    trainers: 6,
    space: 700,
    distance: 2.8,
    image: "studio",
  },
] as const;
export const clubIds = records.map((club) => club.id);
export function getClubs(locale: string): ClubDetailData[] {
  const text = getTranslator(locale);
  const fa = locale === "fa";
  const number = new Intl.NumberFormat(fa ? "fa-IR" : "en-US");
  const photos = {
    strength: {
      src: "/images/clubs/strength.png",
      alt: text("Preview.strengthFloorWithDumbbellsAndTrainingBenches"),
    },
    studio: {
      src: "/images/clubs/studio.png",
      alt: text("Preview.daylitCardioStudio"),
    },
    training: {
      src: "/images/clubs/training.png",
      alt: text("Preview.functionalTrainingAndFreeWeightArea"),
    },
  };
  return records.map((club) => ({
    id: club.id,
    name: text(club.name),
    address: text(club.area),
    category: text(club.category),
    categories:
      club.id === "atlas" || club.id === "zenith"
        ? [text("Copy.strength"), text("Preview.conditioning")]
        : club.id === "forma" || club.id === "nova"
          ? [text("Copy.cardio"), text("Copy.groupWorkout")]
          : [text("Copy.functional"), text("Preview.bodybuilding")],
    price: text("Preview.priceAmount", { amount: club.price }),
    priceValue: club.price,
    priceCurrency: text("Preview.toman"),
    locale: fa ? "fa-IR" : "en-US",
    pricePeriod: text("Preview.visit"),
    rating: number.format(club.rating),
    reviews: number.format(club.reviews),
    photos: [
      photos[club.image],
      ...Object.entries(photos)
        .filter(([key]) => key !== club.image)
        .map(([, photo]) => photo),
    ],
    facilities: [
      text("Preview.proEquipment"),
      text("Preview.trainerCount", { count: club.trainers }),
      text("Preview.spaceArea", { area: club.space }),
    ],
    description: text("Preview.aPlaceToGetStrongerAtYour"),
    // Illustrative branch records for the multi-branch club in this preview.
    branches:
      club.id === "atlas"
        ? [
            {
              id: "atlas-zaferanieh",
              name: text("Preview.zaferaniehBranch"),
              address: text("Preview.zaferaniehTehran"),
              photo: photos.strength,
            },
            {
              id: "atlas-elahiyeh",
              name: text("Preview.elahiyehBranch"),
              address: text("Preview.elahiyehTehran"),
              photo: photos.training,
            },
          ]
        : [],
    coachCount: club.trainers,
    hours: text("Preview.label06002300"),
    distance: text("Preview.distanceAmount", { distance: club.distance }),
    amenities: [
      {
        id: "weights",
        label: text("Preview.freeWeights"),
        description: text("Preview.dumbbellsBarbells"),
      },
      {
        id: "coaching",
        label: text("Preview.personalCoaching"),
        description: text("Preview.personalTraining"),
      },
      {
        id: "showers",
        label: text("Preview.showersLockers"),
        description: text("Preview.changingRooms"),
      },
      {
        id: "wifi",
        label: text("Preview.freeWiFi"),
        description: text("Preview.internetAccess"),
      },
      {
        id: "group",
        label: text("Copy.groupWorkout"),
        description: text("Preview.trainTogether"),
      },
      {
        id: "air",
        label: text("Preview.airConditioning"),
        description: text("Preview.freshAir"),
      },
    ],
  }));
}
