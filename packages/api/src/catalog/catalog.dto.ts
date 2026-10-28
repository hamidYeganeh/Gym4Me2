export type PublicationStatus =
  "draft" | "pending_review" | "published" | "hidden";
export type OperatingStatus =
  "active" | "temporarily_closed" | "permanently_closed";
export type Audience = "all" | "men" | "women" | "mixed" | "family" | "private";
export type TaxonomyKind =
  | "club-categories"
  | "sports"
  | "equipments"
  | "amenities"
  | "tags"
  | "accessibility-features";
export type GeographyKind = "countries" | "provinces" | "cities" | "districts";
export type ReviewStatus = "pending" | "published" | "rejected";
export type PageDto = { page?: number };
export type LocationFiltersDto = PageDto & { parentId?: string };
export type ClubFiltersDto = PageDto & {
  search?: string;
  categoryId?: string;
  sportId?: string;
  countryId?: string;
  provinceId?: string;
  cityId?: string;
  districtId?: string;
  serviceType?: TariffService;
  unit?: TariffUnit;
  minPrice?: number;
  maxPrice?: number;
  sort?: "recent" | "priceLow" | "priceHigh";
};
/** Client-side guard; the API still validates every request. */
export function validCatalogPrices(
  filters: Pick<ClubFiltersDto, "minPrice" | "maxPrice">,
) {
  const valid = (price: number | undefined) =>
    price === undefined ||
    (Number.isInteger(price) && price >= 0 && price <= 1_000_000_000);
  return (
    valid(filters.minPrice) &&
    valid(filters.maxPrice) &&
    (filters.minPrice === undefined ||
      filters.maxPrice === undefined ||
      filters.minPrice <= filters.maxPrice)
  );
}
export type ClubSummaryDto = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  operatingStatus: OperatingStatus;
  startingTariff: {
    priceToman: number;
    unit: TariffUnit;
    serviceType: TariffService;
  } | null;
  cover: MediaDto | null;
  categories: NamedDto[];
  sports: NamedDto[];
  /** Representative public branch matching the request; legacy field name. */
  mainBranch: {
    id: string;
    name: string;
    address: string | null;
    countryId: string | null;
    provinceId: string | null;
    cityId: string | null;
    cityName: string | null;
    districtId: string | null;
    districtName: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  rating: { average: number | null; count: number };
};
export type PublicReviewDto = {
  verified?: boolean;
  id: string;
  author: string | null;
  rating: number;
  body: string | null;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
};
export type NamedDto = { iconName?: string | null; imageUrl?: string | null; id: string; name: string; isActive?: boolean };
export type TaxonomyDto = NamedDto & {
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type SaveTaxonomyDto = {
  iconName?: string | null;
  imageUrl?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  isActive?: boolean;
};
export type PlaceDto = {
  id: string;
  name: string;
  code?: string;
  countryId?: string;
  provinceId?: string;
  cityId?: string;
  clubCount?: number;
};
export type DiscoveryLocationDto = {
  countryId?: string;
  provinceId?: string;
  cityId?: string;
  districtId?: string;
};
export type LocationDiscoveryFiltersDto = DiscoveryLocationDto & {
  randomize?: boolean;
  seed?: string;
};
export type DiscoveryPlaceDto = PlaceDto & {
  parentName: string;
  clubCount: number;
};
export type LocationDiscoveryDto = {
  provinces: DiscoveryPlaceDto[];
  cities: DiscoveryPlaceDto[];
  districts: DiscoveryPlaceDto[];
  location: DiscoveryLocationDto;
  seed: string;
};
export type CreatePlaceDto = {
  kind: GeographyKind;
  name: string;
  parentId?: string;
  code?: string;
};
export type PhoneDto = {
  number: string;
  label: string | null;
  extension: string | null;
  isPrimary: boolean;
};
export type SocialDto = {
  platform:
    | "instagram"
    | "website"
    | "telegram"
    | "whatsapp"
    | "youtube"
    | "aparat"
    | "x"
    | "linkedin"
    | "other";
  link: string;
  label: string | null;
};
export type MediaDto = {
  id: string;
  type: "image" | "video";
  url: string;
  thumbnailUrl: string | null;
  alt: string | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  caption?: string | null;
  sortOrder?: number;
};
export type MediaPreviewDto = { url: string; expiresIn: number | null };
export type UploadMediaDto = { file: File; alt?: string };
export type LocationDto = {
  address: string | null;
  coordinates: [number, number] | null;
  countryId: string | null;
  provinceId: string | null;
  cityId: string | null;
  districtId: string | null;
  neighborhood: string | null;
  cityZone:
    | "north"
    | "south"
    | "east"
    | "west"
    | "central"
    | "northeast"
    | "northwest"
    | "southeast"
    | "southwest"
    | null;
};
export type WeeklyHoursDto = {
  /** Saturday = 0 through Friday = 6, in the branch timezone. */
  dayOfWeek: number;
  audience: Audience;
  startMinute: number;
  endMinute: number;
};
export type OpeningExceptionDto = {
  date: string;
  audience: Audience;
  isClosed: boolean;
  reason: string | null;
  intervals: { startMinute: number; endMinute: number }[];
};
export type AudiencePolicyDto = {
  audiences: Audience[];
  minimumAge: number | null;
  maximumAge: number | null;
  notes: string | null;
};
export type ClubFaqDto = { question: string; answer: string };
export type ClubDto = {
  faq?: ClubFaqDto[];
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  description: string | null;
  shortDescription: string | null;
  publicationStatus: PublicationStatus;
  verificationStatus: string;
  operatingStatus: OperatingStatus;
  lastVerifiedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  logoId: string | null;
  coverId: string | null;
  owner: { id: string; displayName: string | null };
  logo: MediaDto | null;
  cover: MediaDto | null;
  categories: NamedDto[];
  sports: NamedDto[];
  tags: NamedDto[];
  phones: PhoneDto[];
  socials: SocialDto[];
  gallery: MediaDto[];
  branches: {
    id: string;
    name: string;
    isMain: boolean;
    operatingStatus: OperatingStatus;
    cityId: string | null;
  }[];
  rating: { average: number | null; count: number };
  tariffs: TariffDto[];
};
export type TariffService =
  "visit" | "membership" | "court" | "class" | "coaching";
export type TariffUnit =
  "visit" | "hour" | "session" | "month" | "package" | "course";
export type TariffInputDto = {
  name: string;
  serviceType: TariffService;
  priceToman: number;
  unit: TariffUnit;
  durationDays?: number | null;
  sessionCount?: number | null;
  includedServices?: string[];
  conditions: string;
  effectiveFrom?: string;
};
export type TariffDto = TariffInputDto & {
  id: string;
  clubId: string;
  branchId: string | null;
  isActive: boolean;
  versionId: string;
  version: number;
  currency: "IRT";
  effectiveFrom: string;
  createdAt: string;
};
export type SpaceDto = {
  id: string;
  branchId: string;
  name: string;
  capacity: number | null;
  description: string | null;
  operatingStatus: OperatingStatus;
  createdAt: string;
  updatedAt: string;
};
export type BranchProfileDto = {
  id: string;
  clubId: string;
  name: string;
  slug: string;
  timezone: string;
  isMain: boolean;
  operatingStatus: OperatingStatus;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  rules: string | null;
  visitInstructions: string | null;
  audiencePolicies: AudiencePolicyDto | null;
  location: LocationDto;
  sports: NamedDto[];
  equipments: (NamedDto & {
    quantity: number | null;
    description: string | null;
  })[];
  amenities: (NamedDto & {
    availability: string;
    description: string | null;
  })[];
  accessibilityFeatures: (NamedDto & { description: string | null })[];
  phones: PhoneDto[];
  gallery: MediaDto[];
  openingHours: { weekly: WeeklyHoursDto[]; exceptions: OpeningExceptionDto[] };
  spaces: SpaceDto[];
  coaches: {
    id: string;
    coachId: string;
    displayName: string | null;
    biography: string | null;
    sportId: string | null;
  }[];
};
export type ReadinessDto = {
  ready: boolean;
  errors: { field: string; message: string; code?: string }[];
};
export type ReviewDto = {
  id: string;
  branchId: string;
  authorId: string;
  authorName?: string | null;
  rating: number;
  body: string | null;
  status: ReviewStatus;
  moderationReason: string | null;
  reply: string | null;
  createdAt: string;
  updatedAt: string;
};
export type CreateReviewDto = {
  rating: number;
  body?: string | null;
  reservationId?: string;
};
export type MediaInputDto = {
  type: "image" | "video";
  url: string;
  thumbnailUrl?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
};
export type PhoneInputDto = {
  number: string;
  label?: string | null;
  extension?: string | null;
  isPrimary?: boolean;
};
export type GalleryInputDto = { mediaId: string; caption?: string | null };
export type ClubPatchDto = {
  faq?: ClubFaqDto[];
  name?: string;
  slug?: string;
  description?: string | null;
  shortDescription?: string | null;
  logoId?: string | null;
  coverId?: string | null;
  categoryIds?: string[];
  sportIds?: string[];
  tagIds?: string[];
  phones?: (PhoneInputDto | string)[];
  socials?: {
    platform:
      | "instagram"
      | "website"
      | "telegram"
      | "whatsapp"
      | "youtube"
      | "aparat"
      | "x"
      | "linkedin"
      | "other";
    link: string;
    label?: string | null;
  }[];
  gallery?: GalleryInputDto[];
  operatingStatus?: OperatingStatus;
};
export type ClubCreateDto = ClubPatchDto & { name: string };
export type BranchPatchDto = {
  name?: string;
  timezone?: string;
  operatingStatus?: OperatingStatus;
  visitInstructions?: string | null;
  rules?: string | null;
  location?: Partial<LocationDto> | null;
  sportIds?: string[];
  phones?: (PhoneInputDto | string)[];
  gallery?: GalleryInputDto[];
  audiencePolicies?: {
    audiences: Audience[];
    minimumAge?: number | null;
    maximumAge?: number | null;
    notes?: string | null;
  } | null;
  equipments?: {
    equipmentId: string;
    quantity?: number | null;
    description?: string | null;
  }[];
  amenities?: {
    amenityId: string;
    availability?: "included" | "paid" | "unavailable";
    description?: string | null;
  }[];
  accessibilityFeatures?: { featureId: string; description?: string | null }[];
  openingHours?: {
    weekly: (Omit<WeeklyHoursDto, "audience"> & { audience?: Audience })[];
    exceptions?: {
      date: string;
      audience?: Audience;
      isClosed: boolean;
      reason?: string | null;
      intervals?: { startMinute: number; endMinute: number }[];
    }[];
  };
};
export type BranchCreateDto = BranchPatchDto & { name: string };
export type SpaceInputDto = {
  name: string;
  capacity?: number | null;
  description?: string | null;
  operatingStatus?: OperatingStatus;
};
