import type { DocumentDto } from "@repo/api/sports";
import { webFixtureId } from "./public-services";

/** Synthetic document metadata only; contains no file or medical information. */
export function documentFixtures(now = new Date()): DocumentDto[] {
  return [
    {
      id: webFixtureId(1201),
      serviceId: webFixtureId(1),
      name: "مدرک نمایشیِ خدمت دیگر",
      status: "approved",
      revision: 1,
      expiresAt: new Date(+now - 86_400_000).toISOString(),
      reviewedAt: new Date(+now - 2 * 86_400_000).toISOString(),
      reason: null,
      createdAt: new Date(+now - 3 * 86_400_000).toISOString(),
    },
  ];
}
