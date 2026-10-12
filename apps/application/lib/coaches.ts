import type { CoachSummary } from "@repo/ui/kit/CoachCard";

// Illustrative profiles until club-specific coach records are connected to the API.
export function getCoaches(locale: string, clubId: string): CoachSummary[] {
  const fa = locale === "fa";
  return [
    {
      id: `${clubId}-strength`,
      name: fa ? "آرمان رضایی" : "Arman Rezaei",
      specialty: fa ? "مربی قدرتی و پایین‌تنه" : "Strength & lower body",
      photo: {
        src: "/images/clubs/strength.png",
        alt: fa ? "فضای تمرین قدرتی" : "Strength training space",
      },
      rating: 4.5,
      reviews: 90,
      certified: true,
      yearsOfExperience: 5,
      isNew: true,
    },
    {
      id: `${clubId}-movement`,
      name: fa ? "نیکا احمدی" : "Nika Ahmadi",
      specialty: fa ? "مربی آمادگی جسمانی" : "Fitness & movement",
      photo: {
        src: "/images/clubs/studio.png",
        alt: fa ? "استودیوی آمادگی جسمانی" : "Fitness studio",
      },
      rating: 4.8,
      reviews: 64,
      certified: true,
      yearsOfExperience: 7,
    },
    {
      id: `${clubId}-functional`,
      name: fa ? "سامان کریمی" : "Saman Karimi",
      specialty: fa ? "مربی تمرین فانکشنال" : "Functional training",
      photo: {
        src: "/images/clubs/training.png",
        alt: fa ? "فضای تمرین فانکشنال" : "Functional training space",
      },
      rating: 4.2,
      reviews: 48,
      certified: true,
      yearsOfExperience: 4,
    },
  ];
}
