/** Public entrypoints only; the receiving route still enforces account access. */
export const nativeSportsRoutes = [
  { schemeHost: "service", webSegment: "services", shell: "/services/detail" },
  {
    schemeHost: "calendar",
    webSegment: "calendars",
    shell: "/calendars/detail",
  },
  { schemeHost: "booking", webSegment: "bookings", shell: "/bookings/detail" },
  { schemeHost: "order", webSegment: "orders", shell: "/orders/detail" },
  {
    schemeHost: "conversation",
    webSegment: "messages",
    shell: "/messages/conversation",
  },
  {
    schemeHost: "membership",
    webSegment: "memberships",
    shell: "/memberships/detail",
  },
];

export const nativeHttpsPathPrefixes = [
  "/discovery/clubs/",
  ...nativeSportsRoutes.map(({ webSegment }) => `/${webSegment}/`),
];
