"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "@repo/i18n";
import {
  useOrganizations,
  useBusinessClub,
  useBusinessBranch,
  useBusinessReadiness,
  useUpdateClub,
  useUpdateClubBranch,
  usePublication,
  useCreateMedia,
  useUploadMedia,
} from "@repo/api/business";
import {
  useTaxonomies,
  useLocations,
  catalogSelectSource,
} from "@repo/api/catalog";
import { MediaLink } from "./media-link";
import { BusinessTariffs } from "./business-tariffs";
import type {
  ClubDto,
  BranchProfileDto,
  TaxonomyKind,
  NamedDto,
  Audience,
  WeeklyHoursDto,
  OperatingStatus,
  PhoneDto,
} from "@repo/api/catalog";
import { ApiError } from "@repo/api";
import { toast } from "sonner";
import { Button } from "@repo/ui/kit/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@repo/ui/kit/Card";
import { Field, FieldLabel, FieldDescription } from "@repo/ui/kit/Field";
import { Textarea } from "@repo/ui/kit/Textarea";
import { NativeSelect, NativeSelectOption } from "@repo/ui/kit/NativeSelect";
import { Badge } from "@repo/ui/kit/Badge";
import {
  ErrorNotice,
  Loading,
  QueryError,
  Status,
  Submit,
  TextField,
} from "./common";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {hint && <CardDescription>{hint}</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-5">{children}</CardContent>
    </Card>
  );
}
function Multiline({
  label,
  name,
  defaultValue,
  maxLength,
  hint,
  dir = "auto",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  maxLength?: number;
  hint?: string;
  dir?: "auto" | "ltr" | "rtl";
}) {
  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Textarea
        id={name}
        name={name}
        dir={dir}
        defaultValue={defaultValue}
        maxLength={maxLength}
      />
      {hint && <FieldDescription>{hint}</FieldDescription>}
    </Field>
  );
}
function MutationNotice({ error }: { error: unknown }) {
  const fields =
    error instanceof ApiError &&
    error.details &&
    typeof error.details === "object" &&
    "fields" in error.details &&
    Array.isArray(error.details.fields)
      ? error.details.fields
      : [];
  return (
    <>
      <ErrorNotice error={error} />
      {fields.length > 0 && (
        <ul
          className="list-inside list-disc text-sm text-destructive"
          role="alert"
        >
          {fields.map((field: unknown, index: number) => (
            <li key={index}>
              {field &&
              typeof field === "object" &&
              "message" in field &&
              typeof field.message === "string"
                ? field.message
                : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
function TaxonomyPicker({
  kind,
  label,
  value,
  selected,
  onChange,
}: {
  kind: TaxonomyKind;
  label: string;
  value: string[];
  selected: NamedDto[];
  onChange: (value: string[]) => void;
}) {
  const t = useTranslations("BusinessCatalog");
  const [page, setPage] = useState(1);
  const query = useTaxonomies(kind, { page });
  const options = [
    ...selected.filter(
      (item) => !query.data?.some((option) => option.id === item.id),
    ),
    ...(query.data ?? []),
  ];
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <QueryError error={query.error} retry={query.refetch} />
      {query.isLoading && <Loading />}
      <div className="flex flex-wrap gap-3">
        {options.map((option) => (
          <label
            key={option.id}
            className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              className="accent-primary"
              checked={value.includes(option.id)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...value, option.id]
                    : value.filter((id) => id !== option.id),
                )
              }
            />
            {option.name}
            {option.isActive === false && (
              <span className="text-xs text-destructive">
                {t("inactiveSelection")}
              </span>
            )}
          </label>
        ))}
      </div>
      {!query.isLoading && !query.error && !options.length && (
        <FieldDescription>{t("noOptions")}</FieldDescription>
      )}
      {(page > 1 || (query.data?.length ?? 0) === 100) && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={page === 1 || query.isFetching}
            onClick={() => setPage(page - 1)}
          >
            {t("previousOptions")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={query.isFetching || (query.data?.length ?? 0) < 100}
            onClick={() => setPage(page + 1)}
          >
            {t("nextOptions")}
          </Button>
        </div>
      )}
    </Field>
  );
}
const text = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();
const optional = (data: FormData, key: string) => text(data, key) || null;
const phones = (data: FormData, previous: PhoneDto[]) =>
  text(data, "phones")
    .split(/\n/)
    .map((number) => number.trim())
    .filter(Boolean)
    .map((number, index) => {
      const existing =
        previous[index]?.number === number
          ? previous[index]
          : previous.find((item) => item.number === number);
      return existing ?? { number };
    });

export function BusinessClubContent({ id }: { id: string }) {
  const t = useTranslations("BusinessCatalog");
  const query = useBusinessClub(id);
  const organizations = useOrganizations();
  const readiness = useBusinessReadiness(id);
  const publication = usePublication();
  const access = organizations.data?.find((org) => org.id === id);
  const editable =
    access?.role === "owner" ||
    (access?.role === "manager" && access.allBranches);
  async function change(action: "submit" | "publish" | "hide") {
    try {
      await publication.mutateAsync({ id, action });
      toast.success(t("publicationChanged"));
    } catch {
      /* Mutation notice contains the error. */
    }
  }
  return (
    <>
      <Button asChild variant="outline" className="w-fit">
        <Link href="/organizations">{t("back")}</Link>
      </Button>
      <QueryError
        error={query.error ?? organizations.error}
        retry={() => {
          void query.refetch();
          void organizations.refetch();
        }}
      />
      {query.isLoading || organizations.isLoading ? (
        <Loading />
      ) : (
        query.data && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold">{query.data.name}</h2>
              <Status value={query.data.verificationStatus} />
              <Status value={query.data.publicationStatus} />
              {!editable && (
                <p className="text-sm text-muted-foreground">{t("readOnly")}</p>
              )}
            </div>
            <ClubForm key={id} club={query.data} editable={editable} />
            <ClubImages club={query.data} editable={editable} />
            <BusinessTariffs
              club={query.data}
              editable={access?.role === "owner" || access?.role === "manager"}
              allBranches={
                access?.role === "owner" || Boolean(access?.allBranches)
              }
            />
            <Section title={t("branches")}>
              <div className="grid gap-3 sm:grid-cols-2">
                {query.data.branches.map((branch) => (
                  <Link
                    key={branch.id}
                    href={`/organizations/${id}/branches/${branch.id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border p-4 hover:bg-muted/40"
                  >
                    <div>
                      <p className="font-medium">{branch.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("editBranch")}
                      </p>
                    </div>
                    {branch.isMain && (
                      <Badge variant="secondary">{t("mainBranch")}</Badge>
                    )}
                  </Link>
                ))}
              </div>
              <Button asChild variant="outline" className="w-fit">
                <Link href={`/branches?organization=${id}`}>
                  {t("addBranch")}
                </Link>
              </Button>
            </Section>
            <Section title={t("readiness")}>
              <QueryError error={readiness.error} retry={readiness.refetch} />
              {readiness.isLoading ? (
                <Loading />
              ) : (
                readiness.data && (
                  <>
                    <p className="text-sm">
                      {t(readiness.data.ready ? "ready" : "notReady")}
                    </p>
                    <ul className="grid gap-2 text-sm">
                      {readiness.data.errors.map((item) => (
                        <li
                          key={item.field}
                          className="rounded-xl bg-muted/50 p-3"
                        >
                          {item.message}
                        </li>
                      ))}
                    </ul>
                  </>
                )
              )}
              <MutationNotice error={publication.error} />
              {editable && (
                <>
                  <p className="text-sm text-muted-foreground">
                    {t("approvalNeeded")}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      disabled={
                        publication.isPending ||
                        !readiness.data?.ready ||
                        query.data.publicationStatus === "pending_review"
                      }
                      onClick={() => void change("submit")}
                    >
                      {t("submit")}
                    </Button>
                    <Button
                      disabled={
                        publication.isPending ||
                        !readiness.data?.ready ||
                        query.data.verificationStatus !== "approved" ||
                        query.data.publicationStatus === "published"
                      }
                      onClick={() => void change("publish")}
                    >
                      {t("publish")}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={
                        publication.isPending ||
                        query.data.publicationStatus !== "published"
                      }
                      onClick={() => void change("hide")}
                    >
                      {t("hide")}
                    </Button>
                  </div>
                </>
              )}
            </Section>
          </>
        )
      )}
    </>
  );
}
function ClubForm({ club, editable }: { club: ClubDto; editable: boolean }) {
  const t = useTranslations("BusinessCatalog");
  const mutation = useUpdateClub();
  const [categories, setCategories] = useState(
    club.categories.map((item) => item.id),
  );
  const [sports, setSports] = useState(club.sports.map((item) => item.id));
  const [tags, setTags] = useState(club.tags.map((item) => item.id));
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await mutation.mutateAsync({
        id: club.id,
        input: {
          name: text(data, "name"),
          slug: text(data, "slug"),
          shortDescription: optional(data, "shortDescription"),
          description: optional(data, "description"),
          phones: phones(data, club.phones),
          categoryIds: categories,
          sportIds: sports,
          tagIds: tags,
        },
      });
      toast.success(t("saved"));
    } catch {
      /* Keep the draft for correction. */
    }
  }
  return (
    <Section title={t("clubProfile")} hint={t("profileHint")}>
      <form onSubmit={save}>
        <fieldset
          disabled={!editable || mutation.isPending}
          className="grid gap-6"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label={t("name")}
              name="name"
              defaultValue={club.name}
              required
              minLength={2}
              maxLength={120}
            />
            <TextField
              label={t("slug")}
              name="slug"
              defaultValue={club.slug}
              required
              minLength={3}
              maxLength={120}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              dir="ltr"
            />
          </div>
          <Multiline
            label={t("shortDescription")}
            name="shortDescription"
            defaultValue={club.shortDescription ?? ""}
            maxLength={280}
          />
          <Multiline
            label={t("description")}
            name="description"
            defaultValue={club.description ?? ""}
            maxLength={10000}
          />
          <Multiline
            label={t("contact")}
            name="phones"
            dir="ltr"
            defaultValue={club.phones.map((phone) => phone.number).join("\n")}
            hint={t("phoneHint")}
          />
          <TaxonomyPicker
            label={t("categories")}
            kind="club-categories"
            value={categories}
            selected={club.categories}
            onChange={setCategories}
          />
          <TaxonomyPicker
            label={t("sports")}
            kind="sports"
            value={sports}
            selected={club.sports}
            onChange={setSports}
          />
          <TaxonomyPicker
            label={t("tags")}
            kind="tags"
            value={tags}
            selected={club.tags}
            onChange={setTags}
          />
          {editable && (
            <div>
              <Submit busy={mutation.isPending}>{t("save")}</Submit>
            </div>
          )}
        </fieldset>
        <MutationNotice error={mutation.error} />
      </form>
    </Section>
  );
}
function ClubImages({ club, editable }: { club: ClubDto; editable: boolean }) {
  const t = useTranslations("BusinessCatalog");
  const create = useCreateMedia();
  const upload = useUploadMedia();
  const update = useUpdateClub();
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError(null);
    setSaving(true);
    try {
      const file = data.get("file");
      const media =
        file instanceof File && file.size > 0
          ? await upload.mutateAsync({
              id: club.id,
              file,
              alt: text(data, "alt") || undefined,
            })
          : await create.mutateAsync({
              id: club.id,
              input: {
                type: "image",
                url: text(data, "url"),
                alt: optional(data, "alt"),
              },
            });
      await update.mutateAsync({
        id: club.id,
        input: {
          gallery: [
            ...club.gallery.map((item) => ({
              mediaId: item.id,
              caption: item.caption,
            })),
            { mediaId: media.id },
          ],
        },
      });
      form.reset();
      toast.success(t("mediaSaved"));
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }
  async function change(mediaId: string, remove = false) {
    try {
      await update.mutateAsync({
        id: club.id,
        input: remove
          ? {
              gallery: club.gallery
                .filter((item) => item.id !== mediaId)
                .map((item) => ({ mediaId: item.id, caption: item.caption })),
            }
          : { coverId: mediaId },
      });
    } catch {
      /* The shared notice shows errors. */
    }
  }
  return (
    <Section title={t("media")} hint={t("mediaHint")}>
      <div className="grid gap-3 sm:grid-cols-2">
        {club.gallery.map((media) => (
          <div key={media.id} className="grid gap-3 rounded-2xl border p-4">
            <MediaLink
              clubId={club.id}
              mediaId={media.id}
              label={media.alt ?? t("imageUrl")}
            />
            {club.coverId === media.id && (
              <Badge className="w-fit">{t("cover")}</Badge>
            )}
            {editable && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={saving || update.isPending}
                  onClick={() => void change(media.id)}
                >
                  {t("makeCover")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={saving || update.isPending}
                  onClick={() => void change(media.id, true)}
                >
                  {t("removeImage")}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      {editable && (
        <form onSubmit={add}>
          <fieldset
            disabled={saving || update.isPending}
            className="grid gap-4 sm:grid-cols-2"
          >
            <TextField
              label={t("uploadImage")}
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
            />
            <TextField
              label={t("imageUrl")}
              name="url"
              type="url"
              pattern="https://.*"
              dir="ltr"
            />
            <TextField label={t("imageAlt")} name="alt" maxLength={280} />
            <div>
              <Submit busy={saving}>{t("addImage")}</Submit>
            </div>
          </fieldset>
        </form>
      )}
      <MutationNotice error={error ?? update.error} />
    </Section>
  );
}
const audiences = [
  "all",
  "men",
  "women",
  "mixed",
  "family",
  "private",
] as const;
const days = [
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
] as const;
const statuses = [
  "active",
  "temporarily_closed",
  "permanently_closed",
] as const;
export function BusinessBranchContent({
  id,
  branchId,
}: {
  id: string;
  branchId: string;
}) {
  const t = useTranslations("BusinessCatalog");
  const query = useBusinessBranch(id, branchId);
  const organizations = useOrganizations();
  const role = organizations.data?.find((org) => org.id === id)?.role;
  return (
    <>
      <Button asChild variant="outline" className="w-fit">
        <Link href={`/organizations/${id}`}>{t("backClub")}</Link>
      </Button>
      <QueryError
        error={query.error ?? organizations.error}
        retry={() => {
          void query.refetch();
          void organizations.refetch();
        }}
      />
      {query.isLoading || organizations.isLoading ? (
        <Loading />
      ) : (
        query.data && (
          <BranchForm
            key={branchId}
            branch={query.data}
            editable={role === "owner" || role === "manager"}
          />
        )
      )}
    </>
  );
}
function BranchForm({
  branch,
  editable,
}: {
  branch: BranchProfileDto;
  editable: boolean;
}) {
  const t = useTranslations("BusinessCatalog");
  const mutation = useUpdateClubBranch();
  const [location, setLocation] = useState(branch.location);
  const [sports, setSports] = useState(branch.sports.map((item) => item.id));
  const [amenities, setAmenities] = useState(
    branch.amenities.map((item) => item.id),
  );
  const [equipments, setEquipments] = useState(
    branch.equipments.map((item) => item.id),
  );
  const [accessibility, setAccessibility] = useState(
    branch.accessibilityFeatures.map((item) => item.id),
  );
  const [audience, setAudience] = useState<Audience[]>(
    branch.audiencePolicies?.audiences ?? ["all"],
  );
  const [hours, setHours] = useState<WeeklyHoursDto[]>(
    branch.openingHours.weekly,
  );
  const [error, setError] = useState<unknown>(null);
  const countries = useLocations("countries");
  const provinces = useLocations("provinces", location.countryId ?? undefined);
  const cities = useLocations("cities", location.provinceId ?? undefined);
  const districts = useLocations("districts", location.cityId ?? undefined);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const latitude = text(data, "latitude"),
      longitude = text(data, "longitude");
    if (Boolean(latitude) !== Boolean(longitude)) {
      setError("BusinessCatalog.invalidCoordinates");
      return;
    }
    if (hours.some((item) => item.endMinute <= item.startMinute)) {
      setError("BusinessCatalog.invalidHours");
      return;
    }
    try {
      await mutation.mutateAsync({
        id: branch.clubId,
        branchId: branch.id,
        input: {
          name: text(data, "name"),
          operatingStatus: text(data, "operatingStatus") as OperatingStatus,
          location: {
            ...location,
            address: optional(data, "address"),
            coordinates:
              latitude && longitude
                ? [Number(latitude), Number(longitude)]
                : null,
          },
          rules: optional(data, "rules"),
          visitInstructions: optional(data, "visitInstructions"),
          phones: phones(data, branch.phones),
          sportIds: sports,
          audiencePolicies: { ...branch.audiencePolicies, audiences: audience },
          amenities: amenities.map((id) => {
            const existing = branch.amenities.find((item) => item.id === id);
            return {
              amenityId: id,
              availability: existing?.availability as
                "included" | "paid" | "unavailable" | undefined,
              description: existing?.description,
            };
          }),
          equipments: equipments.map((id) => {
            const existing = branch.equipments.find((item) => item.id === id);
            return {
              equipmentId: id,
              quantity: existing?.quantity,
              description: existing?.description,
            };
          }),
          accessibilityFeatures: accessibility.map((id) => ({
            featureId: id,
            description: branch.accessibilityFeatures.find(
              (item) => item.id === id,
            )?.description,
          })),
          openingHours: {
            weekly: hours,
            exceptions: branch.openingHours.exceptions,
          },
        },
      });
      toast.success(t("saved"));
    } catch (err) {
      setError(err);
    }
  }
  const geo = [
    { name: "countryId", label: "country", query: countries },
    { name: "provinceId", label: "province", query: provinces },
    { name: "cityId", label: "city", query: cities },
    { name: "districtId", label: "district", query: districts },
  ] as const;
  return (
    <>
      <h2 className="text-2xl font-semibold">{branch.name}</h2>
      {!editable && (
        <p className="text-sm text-muted-foreground">{t("readOnly")}</p>
      )}
      <form onSubmit={save} className="grid gap-6">
        <fieldset
          disabled={!editable || mutation.isPending}
          className="grid gap-6"
        >
          <Section title={t("branchProfile")} hint={t("permissionsHint")}>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                label={t("name")}
                name="name"
                defaultValue={branch.name}
                required
                minLength={2}
                maxLength={120}
              />
              <Field>
                <FieldLabel htmlFor="operatingStatus">
                  {t("operatingStatus")}
                </FieldLabel>
                <NativeSelect
                  id="operatingStatus"
                  name="operatingStatus"
                  defaultValue={branch.operatingStatus}
                >
                  {statuses.map((value) => (
                    <NativeSelectOption key={value} value={value}>
                      {t(value)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Multiline
              label={t("contact")}
              name="phones"
              dir="ltr"
              defaultValue={branch.phones
                .map((phone) => phone.number)
                .join("\n")}
              hint={t("phoneHint")}
            />
            <Multiline
              label={t("rules")}
              name="rules"
              defaultValue={branch.rules ?? ""}
              maxLength={5000}
            />
            <Multiline
              label={t("visitInstructions")}
              name="visitInstructions"
              defaultValue={branch.visitInstructions ?? ""}
              maxLength={3000}
            />
          </Section>
          <Section title={t("location")}>
            <Multiline
              label={t("address")}
              name="address"
              defaultValue={branch.location.address ?? ""}
              maxLength={1000}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              {geo.map(({ name, label, query }) => (
                <Field key={name}>
                  <FieldLabel htmlFor={name}>{t(label)}</FieldLabel>
                  <NativeSelect
                    id={name}
                    optionsSource={catalogSelectSource(
                      (
                        {
                          countryId: "countries",
                          provinceId: "provinces",
                          cityId: "cities",
                          districtId: "districts",
                        } as const
                      )[name],
                      name === "provinceId"
                        ? (location.countryId ?? undefined)
                        : name === "cityId"
                          ? (location.provinceId ?? undefined)
                          : name === "districtId"
                            ? (location.cityId ?? undefined)
                            : undefined,
                    )}
                    value={location[name] ?? ""}
                    disabled={
                      query.isLoading ||
                      (name !== "countryId" &&
                        !location[
                          geo[geo.findIndex((item) => item.name === name) - 1]!
                            .name
                        ])
                    }
                    onChange={(event) =>
                      setLocation((current) => ({
                        ...current,
                        [name]: event.target.value || null,
                        ...(name === "countryId"
                          ? { provinceId: null, cityId: null, districtId: null }
                          : name === "provinceId"
                            ? { cityId: null, districtId: null }
                            : name === "cityId"
                              ? { districtId: null }
                              : {}),
                      }))
                    }
                  >
                    <NativeSelectOption value="">
                      {t("select")}
                    </NativeSelectOption>
                    {query.data?.map((place) => (
                      <NativeSelectOption key={place.id} value={place.id}>
                        {place.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <QueryError error={query.error} retry={query.refetch} />
                </Field>
              ))}
              <TextField
                label={t("latitude")}
                name="latitude"
                type="number"
                step="any"
                min={-90}
                max={90}
                dir="ltr"
                defaultValue={branch.location.coordinates?.[0] ?? ""}
              />
              <TextField
                label={t("longitude")}
                name="longitude"
                type="number"
                step="any"
                min={-180}
                max={180}
                dir="ltr"
                defaultValue={branch.location.coordinates?.[1] ?? ""}
              />
            </div>
          </Section>
          <Section title={t("sports")}>
            <TaxonomyPicker
              kind="sports"
              label={t("sports")}
              value={sports}
              selected={branch.sports}
              onChange={setSports}
            />
            <TaxonomyPicker
              kind="amenities"
              label={t("amenities")}
              value={amenities}
              selected={branch.amenities}
              onChange={setAmenities}
            />
            <TaxonomyPicker
              kind="equipments"
              label={t("equipments")}
              value={equipments}
              selected={branch.equipments}
              onChange={setEquipments}
            />
            <TaxonomyPicker
              kind="accessibility-features"
              label={t("accessibility")}
              value={accessibility}
              selected={branch.accessibilityFeatures}
              onChange={setAccessibility}
            />
            <Field>
              <FieldLabel>{t("audience")}</FieldLabel>
              <div className="flex flex-wrap gap-4">
                {audiences.map((value) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={audience.includes(value)}
                      onChange={(event) =>
                        setAudience(
                          event.target.checked
                            ? [...audience, value]
                            : audience.filter((item) => item !== value),
                        )
                      }
                    />
                    {t(value)}
                  </label>
                ))}
              </div>
            </Field>
          </Section>
          <Section title={t("hours")} hint={t("hoursHint")}>
            {hours.map((hour, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                <Field>
                  <FieldLabel htmlFor={`day-${index}`}>{t("day")}</FieldLabel>
                  <NativeSelect
                    id={`day-${index}`}
                    value={hour.dayOfWeek}
                    onChange={(event) =>
                      setHours((current) =>
                        current.map((item, i) =>
                          i === index
                            ? { ...item, dayOfWeek: Number(event.target.value) }
                            : item,
                        ),
                      )
                    }
                  >
                    {days.map((day, i) => (
                      <NativeSelectOption key={day} value={i}>
                        {t(day)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`audience-${index}`}>
                    {t("audience")}
                  </FieldLabel>
                  <NativeSelect
                    id={`audience-${index}`}
                    value={hour.audience}
                    onChange={(event) =>
                      setHours((current) =>
                        current.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                audience: event.target.value as Audience,
                              }
                            : item,
                        ),
                      )
                    }
                  >
                    {audiences.map((value) => (
                      <NativeSelectOption key={value} value={value}>
                        {t(value)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                {(["startMinute", "endMinute"] as const).map((key, i) => (
                  <TextField
                    key={key}
                    name={`${key}-${index}`}
                    label={t(i === 0 ? "start" : "end")}
                    type="time"
                    required
                    value={`${String(Math.floor((hour[key] % 1440) / 60)).padStart(2, "0")}:${String(hour[key] % 60).padStart(2, "0")}`}
                    onChange={(event) => {
                      const parts = event.target.value.split(":").map(Number);
                      setHours((current) =>
                        current.map((item, j) =>
                          j === index
                            ? {
                                ...item,
                                [key]:
                                  (parts[0] ?? 0) * 60 +
                                  (parts[1] ?? 0) +
                                  (key === "endMinute" && item.endMinute >= 1440
                                    ? 1440
                                    : 0),
                              }
                            : item,
                        ),
                      );
                    }}
                  />
                ))}
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={hour.endMinute >= 1440}
                    onChange={(event) =>
                      setHours((current) =>
                        current.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                endMinute:
                                  (item.endMinute % 1440) +
                                  (event.target.checked ? 1440 : 0),
                              }
                            : item,
                        ),
                      )
                    }
                  />
                  {t("nextDay")}
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setHours((current) => current.filter((_, i) => i !== index))
                  }
                >
                  {t("remove")}
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              onClick={() =>
                setHours((current) => [
                  ...current,
                  {
                    dayOfWeek: 0,
                    audience: "all",
                    startMinute: 360,
                    endMinute: 1380,
                  },
                ])
              }
            >
              {t("addHours")}
            </Button>
          </Section>
          {editable && (
            <div>
              <Submit busy={mutation.isPending}>{t("save")}</Submit>
            </div>
          )}
        </fieldset>
        <MutationNotice error={error} />
      </form>
    </>
  );
}
