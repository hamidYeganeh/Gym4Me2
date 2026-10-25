import { getLocaleMessages } from "@repo/i18n/messages";

/** Decorative, locally bundled covers; unknown places use the card's neutral fallback. */
export function locationCover(name: string): {
  cover?: { src: string; alt: string };
  tone: "sky" | "green" | "amber";
} {
  const normalize = (value: string) =>
    value
      .normalize("NFKC")
      .replace(/\u064a/g, String.fromCodePoint(0x6cc))
      .replace(/\u0643/g, String.fromCodePoint(0x6a9))
      .trim()
      .toLowerCase();
  const key = normalize(name);
  const places = {
    tehran: ["tehran", "sky"],
    shiraz: ["shiraz", "amber"],
    fars: ["shiraz", "amber"],
    isfahan: ["isfahan", "amber"],
    niavaran: ["niavaran", "green"],
    tajrish: ["tajrish", "green"],
  } as const;
  const match = (Object.keys(places) as (keyof typeof places)[]).find((id) =>
    [
      id,
      getLocaleMessages("fa").Website.locations.names[id],
      getLocaleMessages("en").Website.locations.names[id],
    ].some((label) => normalize(label) === key),
  );
  const place = match && places[match];
  return place
    ? {
        cover: { src: `/images/locations/${place[0]}.webp`, alt: "" },
        tone: place[1],
      }
    : { tone: "green" };
}
