export const resourceCatalogs = {
  countries: { group: "locations", parent: null },
  provinces: { group: "locations", parent: "countries" },
  cities: { group: "locations", parent: "provinces" },
  districts: { group: "locations", parent: "cities" },
  neighborhoods: { group: "locations", parent: "districts" },
  club_types: { group: "types", parent: null },
  coach_types: { group: "types", parent: null },
  gallery_media_types: { group: "types", parent: null },
  sport_categories: { group: "catalogs", parent: null },
  sports: { group: "catalogs", parent: "sport_categories" },
  sub_sports: { group: "catalogs", parent: "sports" },
  equipment: { group: "catalogs", parent: null },
  amenities: { group: "catalogs", parent: null },
} as const;

export type ResourceKind = keyof typeof resourceCatalogs;
export const resourceKinds = Object.keys(resourceCatalogs) as ResourceKind[];
export const resourceGroups = ["locations", "types", "catalogs"] as const;

export const resourceEndpoint = (kind: ResourceKind) =>
  `/api/resources/${resourceCatalogs[kind].group}/${kind}`;
