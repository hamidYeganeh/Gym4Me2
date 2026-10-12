import type { ClubDetailData } from "@repo/ui/kit/ClubDetail";

const records = [
  {
    id: "atlas",
    name: ["باشگاه اطلس", "Atlas Athletic Club"],
    area: ["تهران، زعفرانیه", "Zaferanieh, Tehran"],
    category: ["قدرتی و تناسب اندام", "Strength & conditioning"],
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
    name: ["استودیو فرما", "Forma Fitness Studio"],
    area: ["تهران، نیاوران", "Niavaran, Tehran"],
    category: ["هوازی و تمرین گروهی", "Movement & cardio"],
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
    name: ["باشگاه پالس", "Pulse Training Club"],
    area: ["تهران، ولنجک", "Velenjak, Tehran"],
    category: ["فانکشنال و بدنسازی", "Functional training"],
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
    name: ["باشگاه زنیت", "Zenith Fitness"],
    area: ["تهران، زعفرانیه", "Zaferanieh, Tehran"],
    category: ["قدرتی و تناسب اندام", "Strength & conditioning"],
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
    name: ["استودیو نوا", "Nova Movement Studio"],
    area: ["تهران، نیاوران", "Niavaran, Tehran"],
    category: ["هوازی و تمرین گروهی", "Movement & cardio"],
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
  const fa = locale === "fa";
  const number = new Intl.NumberFormat(fa ? "fa-IR" : "en-US");
  const photos = {
    strength: {
      src: "/images/clubs/strength.png",
      alt: fa
        ? "سالن بدنسازی با دمبل‌ها و نیمکت‌های تمرین"
        : "Strength floor with dumbbells and training benches",
    },
    studio: {
      src: "/images/clubs/studio.png",
      alt: fa ? "استودیوی هوازی با نور طبیعی" : "Daylit cardio studio",
    },
    training: {
      src: "/images/clubs/training.png",
      alt: fa
        ? "فضای تمرین فانکشنال و وزنه آزاد"
        : "Functional training and free-weight area",
    },
  };
  return records.map((club) => ({
    id: club.id,
    name: club.name[fa ? 0 : 1],
    address: club.area[fa ? 0 : 1],
    category: club.category[fa ? 0 : 1],
    categories:
      club.id === "atlas" || club.id === "zenith"
        ? fa
          ? ["قدرتی", "تناسب اندام"]
          : ["Strength", "Conditioning"]
        : club.id === "forma" || club.id === "nova"
          ? fa
            ? ["هوازی", "تمرین گروهی"]
            : ["Cardio", "Group training"]
          : fa
            ? ["فانکشنال", "بدنسازی"]
            : ["Functional", "Bodybuilding"],
    price: `${number.format(club.price)} ${fa ? "تومان" : "toman"}`,
    priceValue: club.price,
    priceCurrency: fa ? "تومان" : "toman",
    locale: fa ? "fa-IR" : "en-US",
    pricePeriod: fa ? "جلسه" : "visit",
    rating: number.format(club.rating),
    reviews: number.format(club.reviews),
    photos: [
      photos[club.image],
      ...Object.entries(photos)
        .filter(([key]) => key !== club.image)
        .map(([, photo]) => photo),
    ],
    facilities: [
      fa ? "تجهیزات حرفه‌ای" : "Pro equipment",
      `${number.format(club.trainers)} ${fa ? "مربی" : "trainers"}`,
      `${number.format(club.space)} ${fa ? "متر مربع" : "m²"}`,
    ],
    description: fa
      ? "جایی برای قوی‌تر شدن، با ریتم خودت. از فضای وزنه آزاد و دستگاه‌های حرفه‌ای تا تمرین‌های گروهی، اینجا برای هر سبک تمرین فضایی پیدا می‌کنی. نور طبیعی، رختکن مجهز و مربیانی که در مسیرت همراهت هستند، تجربه تمرین را کامل می‌کنند."
      : "A place to get stronger, at your own pace. From the free-weight floor and carefully selected equipment to small group sessions, find room for the way you like to move. Natural light, comfortable changing rooms, and supportive coaches make every visit feel considered.",
    // Illustrative branch records for the multi-branch club in this preview.
    branches:
      club.id === "atlas"
        ? [
            {
              id: "atlas-zaferanieh",
              name: fa ? "شعبه زعفرانیه" : "Zaferanieh branch",
              address: fa ? "تهران، زعفرانیه" : "Zaferanieh, Tehran",
              photo: photos.strength,
            },
            {
              id: "atlas-elahiyeh",
              name: fa ? "شعبه الهیه" : "Elahiyeh branch",
              address: fa ? "تهران، الهیه" : "Elahiyeh, Tehran",
              photo: photos.training,
            },
          ]
        : [],
    coachCount: club.trainers,
    hours: fa ? "۶ تا ۲۳" : "06:00–23:00",
    distance: `${number.format(club.distance)} ${fa ? "کیلومتر" : "km"}`,
    amenities: [
      {
        id: "weights",
        label: fa ? "وزنه آزاد" : "Free weights",
        description: fa ? "دمبل و هالتر" : "Dumbbells & barbells",
      },
      {
        id: "coaching",
        label: fa ? "مربی خصوصی" : "Personal coaching",
        description: fa ? "تمرین شخصی" : "Personal training",
      },
      {
        id: "showers",
        label: fa ? "رختکن و دوش" : "Showers & lockers",
        description: fa ? "فضای تعویض لباس" : "Changing rooms",
      },
      {
        id: "wifi",
        label: fa ? "اینترنت رایگان" : "Free Wi-Fi",
        description: fa ? "اتصال به اینترنت" : "Internet access",
      },
      {
        id: "group",
        label: fa ? "تمرین گروهی" : "Group training",
        description: fa ? "تمرین در کنار هم" : "Train together",
      },
      {
        id: "air",
        label: fa ? "تهویه مطبوع" : "Air conditioning",
        description: fa ? "هوای تازه" : "Fresh air",
      },
    ],
  }));
}
