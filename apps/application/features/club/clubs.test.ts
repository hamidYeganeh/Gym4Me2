import { describe, expect, it } from "vitest";

import type { PublicClub } from "./api";

import { clubMediaUrl } from "./api";
import { fromPublicClub } from "./clubs";

const club: PublicClub = {
  id: "e47b282b-a727-4c9d-a348-e1b7dca38fe0",
  title: "باشگاه تست",
  description: "توضیحات منتشرشده",
  clubTypeId: "gym",
  location: {
    address: "تهران",
    lat: 35.7,
    lng: 51.4,
    cityId: "tehran",
    provinceId: "province",
    districtId: null,
    neighborhoodId: null,
  },
  labels: { shower: "دوش" },
  sports: [],
  equipment: [],
  amenities: [{ id: "shower", description: "آب گرم" }],
  gallery: [
    {
      hash: "photo",
      title: "سالن",
      description: "سالن تمرین",
      typeId: "interior",
      contentType: "image/jpeg",
    },
    { hash: "video", title: "بازدید", description: "", typeId: "tour", contentType: "video/mp4" },
  ],
};
describe("published club presentation", () => {
  it("uses published content and authorized media routes", () => {
    const result = fromPublicClub(club);
    expect(result.name).toBe(club.title);
    expect(result.amenities).toEqual(["دوش · آب گرم"]);
    expect(result.photos).toEqual([
      { src: clubMediaUrl(club.id, "photo"), alt: "سالن تمرین", label: "سالن" },
    ]);
    expect(result.published).toBe(club);
  });
  it("does not invent reviews, pricing, or photos when unavailable", () => {
    const result = fromPublicClub({ ...club, gallery: [], amenities: [] });
    expect(result.reviewEntries).toEqual([]);
    expect(result.photos).toEqual([]);
    expect(result.amenities).toEqual([]);
    expect(result.monthlyPrice).toBe("");
    expect(result.hours).toBe("");
  });
  it("encodes media identifiers as path segments", () => {
    expect(clubMediaUrl("club/id", "hash?value")).toContain("club%2Fid/media/hash%3Fvalue");
  });
});
