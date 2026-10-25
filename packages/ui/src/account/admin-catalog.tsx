"use client";
import { catalogSelectSource } from "@repo/api/catalog";
import { FilterSheet } from "../kit/BottomSheet";
import { AdminServiceReports } from "../training/service-reviews";
import { useTranslations, useLocale } from "@repo/i18n";

import {
  useAdminTaxonomies,
  useAdminLocations,
  useAdminReviews,
  useCreateTaxonomy,
  useUpdateTaxonomy,
  useCreateLocation,
  useUpdateLocation,
  useModerateReview,
} from "@repo/api/admin";
import type {
  TaxonomyDto as Term,
  PlaceDto as Place,
  TaxonomyKind,
  GeographyKind as PlaceKind,
  ReviewStatus,
} from "@repo/api/catalog";

import type { TranslationKey } from "@repo/i18n/messages";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "../kit/Sileo";
import { Button } from "@repo/ui/kit/Button";
import { Card, CardContent } from "@repo/ui/kit/Card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@repo/ui/kit/Dialog";
import { Field, FieldLabel } from "@repo/ui/kit/Field";
import { NativeSelect, NativeSelectOption } from "@repo/ui/kit/NativeSelect";
import { Textarea } from "@repo/ui/kit/Textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/kit/Table";

import {
  Blank,
  ErrorNotice,
  Loading,
  QueryError,
  Status,
  Submit,
  TextField,
  useDateLabel,
  useLabelMap,
} from "./common";
import { DecisionDialog, Pager, type Decision } from "./admin";

const taxonomyKeys = [
  { id: "club-categories", name: "Copy.clubType" },
  { id: "sports", name: "Copy.sports" },
  { id: "equipments", name: "Copy.equipment" },
  { id: "amenities", name: "Copy.amenities" },
  { id: "tags", name: "Copy.tags" },
  { id: "accessibility-features", name: "Copy.accessibility" },
] as const;

export function AdminTaxonomiesContent() {
  const t = useTranslations();

  const taxonomies = taxonomyKeys.map((item) => ({
    ...item,
    name: t(item.name),
  }));
  const [kind, setKind] = useState<TaxonomyKind>("club-categories");
  const [page, setPage] = useState(1);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Term | "new" | null>(null);
  const query = useAdminTaxonomies(kind, { page, search });
  return (
    <>
      <p className="text-sm text-muted-foreground">
        {t("Copy.categoriesAreUsedInClubFormsAnd")}{" "}
      </p>
      <FilterSheet>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(input);
            setPage(1);
          }}
        >
          <Field className="w-56">
            <FieldLabel htmlFor="taxonomyKind">{t("Copy.group")}</FieldLabel>
            <NativeSelect
              id="taxonomyKind"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as TaxonomyKind);
                setPage(1);
                setSearch("");
                setInput("");
              }}
            >
              {taxonomies.map((t) => (
                <NativeSelectOption key={t.id} value={t.id}>
                  {t.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <TextField
            name="termSearch"
            fieldClassName="w-full sm:w-64"
            label={t("Copy.search")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={100}
            placeholder={t("Copy.categoryName")}
          />
          <Button type="submit" variant="outline">
            {t("Copy.search")}{" "}
          </Button>
        </form>
      </FilterSheet>
      <Button type="button" onClick={() => setEditing("new")}>
        {t("Copy.addItem")}
      </Button>
      <QueryError error={query.error} retry={query.refetch} />
      {query.isLoading ? (
        <Loading />
      ) : (
        query.data && (
          <>
            {!query.data.length ? (
              <Blank
                title={t("Copy.noItemsFound")}
                description={t("Copy.addAnItemOrChangeYourSearch")}
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("Copy.name")}</TableHead>
                        <TableHead>{t("Copy.slug")}</TableHead>
                        <TableHead>{t("Copy.status")}</TableHead>
                        <TableHead>{t("Copy.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {query.data.map((term) => (
                        <TableRow key={term.id}>
                          <TableCell>
                            <p className="font-medium">{term.name}</p>
                            <p className="max-w-sm whitespace-normal text-xs leading-6 text-muted-foreground">
                              {term.description}
                            </p>
                          </TableCell>
                          <TableCell>
                            <bdi>{term.slug}</bdi>
                          </TableCell>
                          <TableCell>
                            <Status
                              value={term.isActive ? "active" : "inactive"}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditing(term)}
                            >
                              {t("Copy.edit")}{" "}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
            <Pager
              page={page}
              setPage={setPage}
              count={query.data.length}
              pageSize={100}
            />
          </>
        )
      )}
      {editing && (
        <TermDialog
          key={editing === "new" ? "new" : editing.id}
          kind={kind}
          term={editing === "new" ? null : editing}
          close={() => setEditing(null)}
        />
      )}
    </>
  );
}

function TermDialog({
  kind,
  term,
  close,
}: {
  kind: TaxonomyKind;
  term: Term | null;
  close: () => void;
}) {
  const t = useTranslations();

  const createTerm = useCreateTaxonomy();
  const updateTerm = useUpdateTaxonomy();

  const [name, setName] = useState(term?.name ?? "");
  const [slug, setSlug] = useState(term?.slug ?? "");
  const [description, setDescription] = useState(term?.description ?? "");
  const [active, setActive] = useState(term?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (term)
        await updateTerm.mutateAsync({
          kind,
          id: term.id,
          input: {
            name: name.trim(),
            slug,
            description: description.trim() || null,
            isActive: active,
          },
        });
      else
        await createTerm.mutateAsync({
          kind,
          input: {
            name: name.trim(),
            slug,
            description: description.trim() || null,
            isActive: active,
          },
        });

      toast.success(t("Copy.categorySaved"));
      close();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {term ? t("Copy.editCategory") : t("Copy.addCategory")}
          </DialogTitle>
          <DialogDescription>
            {t("Copy.enterADisplayNameAndAUnique")}{" "}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <TextField
            name="termName"
            label={t("Copy.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={160}
          />
          <TextField
            name="termSlug"
            label={t("Copy.slug")}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            dir="ltr"
            required
            maxLength={120}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder={t("Copy.slugPlaceholder")}
          />
          <Field>
            <FieldLabel htmlFor="termDescription">
              {t("Copy.description")}
            </FieldLabel>
            <Textarea
              id="termDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="termActive">{t("Copy.status")}</FieldLabel>
            <NativeSelect
              id="termActive"
              value={active ? "active" : "inactive"}
              onChange={(e) => setActive(e.target.value === "active")}
            >
              <NativeSelectOption value="active">
                {t("Copy.active")}
              </NativeSelectOption>
              <NativeSelectOption value="inactive">
                {t("Copy.inactive")}
              </NativeSelectOption>
            </NativeSelect>
          </Field>
          <ErrorNotice error={error} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={close}
            >
              {t("Copy.cancel")}{" "}
            </Button>
            <Submit busy={busy}>{t("Copy.save")}</Submit>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const placeKeys: Record<PlaceKind, TranslationKey> = {
  countries: "Copy.country",
  provinces: "Copy.province",
  cities: "Copy.city",
  districts: "Copy.district",
};

export function AdminLocationsContent() {
  const placeNames = useLabelMap(placeKeys);
  const t = useTranslations();

  const [country, setCountry] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [kind, setKind] = useState<PlaceKind>("countries");
  const [editing, setEditing] = useState<Place | "new" | null>(null);
  const countries = useAdminLocations("countries");
  const provinces = useAdminLocations("provinces", country || undefined);
  const cities = useAdminLocations("cities", province || undefined);
  const districts = useAdminLocations("districts", city || undefined);
  const query = { countries, provinces, cities, districts }[kind];
  const parentId = {
    countries: "",
    provinces: country,
    cities: province,
    districts: city,
  }[kind];
  const canCreate = kind === "countries" || Boolean(parentId);
  return (
    <>
      <p className="text-sm text-muted-foreground">
        {t("Copy.manageCountriesProvincesCitiesAndDistrictsIn")}{" "}
      </p>
      {[countries, provinces, cities].map((q, i) => (
        <QueryError key={i} error={q.error} retry={q.refetch} />
      ))}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <FilterSheet count={[country, province, city].filter(Boolean).length}>
          <div className="grid gap-3 sm:grid-cols-3">
            <PlaceSelect
              label={t("Copy.country")}
              id="countryScope"
              optionsSource={catalogSelectSource("countries", undefined, true)}
              value={country}
              items={countries.data}
              loading={countries.isLoading}
              onChange={(v) => {
                setCountry(v);
                setProvince("");
                setCity("");
              }}
            />
            <PlaceSelect
              label={t("Copy.province")}
              id="provinceScope"
              optionsSource={catalogSelectSource("provinces", country, true)}
              value={province}
              items={provinces.data}
              loading={provinces.isLoading}
              disabled={!country}
              onChange={(v) => {
                setProvince(v);
                setCity("");
              }}
            />
            <PlaceSelect
              label={t("Copy.city")}
              id="cityScope"
              optionsSource={catalogSelectSource("cities", province, true)}
              value={city}
              items={cities.data}
              loading={cities.isLoading}
              disabled={!province}
              onChange={setCity}
            />
          </div>
          <Field className="w-56">
            <FieldLabel htmlFor="placeKind">{t("Copy.list")}</FieldLabel>
            <NativeSelect
              id="placeKind"
              value={kind}
              onChange={(e) => setKind(e.target.value as PlaceKind)}
            >
              {Object.entries(placeNames).map(([key, label]) => (
                <NativeSelectOption key={key} value={key}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </FilterSheet>
        <Button
          disabled={!canCreate || query.isLoading}
          onClick={() => setEditing("new")}
        >
          {t("Copy.add")} {placeNames[kind]}
        </Button>
      </div>
      {kind === "districts" && (
        <QueryError error={districts.error} retry={districts.refetch} />
      )}
      {!canCreate ? (
        <Blank
          title={t("Copy.selectAParentFirst")}
          description={t("Copy.selectTheRelevantCountryProvinceOrCity")}
        />
      ) : query.isLoading ? (
        <Loading />
      ) : (
        query.data &&
        (!query.data.length ? (
          <Blank
            title={t("Copy.noItemsYet")}
            description={t("Copy.addTheFirstLocationInThisArea")}
          />
        ) : (
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {t("Copy.name")} {placeNames[kind]}
                    </TableHead>
                    {kind === "countries" && (
                      <TableHead>{t("Copy.countryCode")}</TableHead>
                    )}
                    <TableHead>{t("Copy.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data.map((place) => (
                    <TableRow key={place.id}>
                      <TableCell>{place.name}</TableCell>
                      {kind === "countries" && (
                        <TableCell>
                          <bdi>{place.code}</bdi>
                        </TableCell>
                      )}
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditing(place)}
                        >
                          {t("Copy.editName")}{" "}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
      {editing && (
        <PlaceDialog
          key={editing === "new" ? "new" : editing.id}
          kind={kind}
          parentId={parentId}
          place={editing === "new" ? null : editing}

          close={() => setEditing(null)}
        />
      )}
    </>
  );
}
function PlaceSelect({
  label,
  id,
  value,
  items,
  onChange,
  disabled,
  loading,
  optionsSource,
}: {
  label: string;
  id: string;
  value: string;
  items?: Place[];
  onChange: (v: string) => void;
  disabled?: boolean;
  loading: boolean;
  optionsSource?: React.ComponentProps<typeof NativeSelect>["optionsSource"];
}) {
  const t = useTranslations();

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect
        id={id}
        optionsSource={optionsSource}
        value={value}
        disabled={disabled || loading}
        onChange={(e) => onChange(e.target.value)}
      >
        <NativeSelectOption value="">
          {loading
            ? t("Copy.loading")
            : t("Copy.selectLabel", { label: label })}
        </NativeSelectOption>
        {items?.map((p) => (
          <NativeSelectOption key={p.id} value={p.id}>
            {p.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
  );
}
function PlaceDialog({
  kind,
  parentId,
  place,
  close,
}: {
  kind: PlaceKind;
  parentId: string;
  place: Place | null;
  close: () => void;
}) {
  const placeNames = useLabelMap(placeKeys);
  const t = useTranslations();

  const createPlace = useCreateLocation();
  const updatePlace = useUpdateLocation();

  const [name, setName] = useState(place?.name ?? "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (place)
        await updatePlace.mutateAsync({
          kind,
          id: place.id,
          input: { name: name.trim() },
        });
      else
        await createPlace.mutateAsync({
          kind,
          name: name.trim(),
          ...(kind === "countries" ? { code } : { parentId }),
        });

      toast.success(t("Copy.locationSaved"));
      close();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {place ? t("Copy.edit") : t("Copy.add")} {placeNames[kind]}
          </DialogTitle>
          <DialogDescription>
            {t("Copy.enterTheCommonlyUsedDisplayName")}{" "}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <TextField
            name="placeName"
            label={t("Copy.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={160}
          />
          {!place && kind === "countries" && (
            <TextField
              name="countryCode"
              label={t("Copy.twoLetterCountryCode")}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              dir="ltr"
              required
              minLength={2}
              maxLength={2}
              pattern="[A-Z]{2}"
              placeholder={t("Copy.countryPlaceholder")}
            />
          )}
          <ErrorNotice error={error} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={close}
            >
              {t("Copy.cancel")}{" "}
            </Button>
            <Submit busy={busy}>{t("Copy.save")}</Submit>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminModerationContent() {
  const dateLabel = useDateLabel();

  const locale = useLocale();

  const t = useTranslations();

  const moderation = useModerateReview();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("pending");
  const [decision, setDecision] = useState<
    (Decision & { expectedStatus: string }) | null
  >(null);
  const query = useAdminReviews({ page, status: status as ReviewStatus });
  async function save(reason: string) {
    if (!decision) return;
    await moderation.mutateAsync({
      id: decision.id,
      input: {
        status: decision.status as "published" | "rejected",
        reason,
        expectedStatus: decision.expectedStatus as ReviewStatus,
      },
    });
  }
  return (
    <>
      <AdminServiceReports />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <FilterSheet>
          <Field className="w-56">
            <FieldLabel htmlFor="moderationStatus">
              {t("Copy.reviewStatus")}
            </FieldLabel>
            <NativeSelect
              id="moderationStatus"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <NativeSelectOption value="pending">
                {t("Copy.pendingReview")}{" "}
              </NativeSelectOption>
              <NativeSelectOption value="published">
                {t("Copy.published")}
              </NativeSelectOption>
              <NativeSelectOption value="rejected">
                {t("Copy.rejected")}
              </NativeSelectOption>
            </NativeSelect>
          </Field>
        </FilterSheet>
        <Button variant="outline" onClick={() => void query.refetch()}>
          {t("Copy.refreshList")}{" "}
        </Button>
      </div>
      <QueryError error={query.error} retry={query.refetch} />
      {query.isLoading ? (
        <Loading />
      ) : (
        query.data && (
          <>
            {!query.data.length ? (
              <Blank
                title={t("Copy.noReviewsInThisStatus")}
                description={t("Copy.userReviewsAppearHereForModeration")}
              />
            ) : (
              <div className="grid gap-4">
                {query.data.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="grid gap-4 pt-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <Link
                            className="font-semibold hover:underline"
                            href={`/organizations/${review.organizationId}/branches/${review.branchId}`}
                          >
                            {review.organizationName} · {review.branchName}
                          </Link>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {review.authorName ?? t("Copy.unnamedUser")} ·{" "}
                            {dateLabel(review.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm">
                            {t("Copy.rating")}{" "}
                            {review.rating.toLocaleString(locale)}{" "}
                            {t("Copy.outOf5")}{" "}
                          </span>
                          <Status value={review.status} />
                        </div>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-7">
                        {review.body || t("Copy.noReviewTextProvided")}
                      </p>
                      {review.reply && (
                        <p className="border-s-2 ps-3 text-sm leading-7 text-muted-foreground">
                          {t("Copy.clubReply")} {review.reply}
                        </p>
                      )}
                      {review.moderationReason && (
                        <p className="text-sm text-muted-foreground">
                          {t("Copy.previousDecisionReason")}{" "}
                          {review.moderationReason}
                        </p>
                      )}
                      <div className="flex gap-2">
                        {[
                          {
                            status: "published",
                            label: t("Copy.approveAndPublish"),
                          },
                          { status: "rejected", label: t("Copy.rejectReview") },
                        ]
                          .filter((item) => item.status !== review.status)
                          .map((item) => (
                            <Button
                              key={item.status}
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setDecision({
                                  id: review.id,
                                  title: item.label,
                                  status: item.status,
                                  expectedStatus: review.status,
                                })
                              }
                            >
                              {item.label}
                            </Button>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            <Pager page={page} setPage={setPage} count={query.data.length} />
          </>
        )
      )}
      <DecisionDialog
        key={`${decision?.id}-${decision?.status}`}
        decision={decision}
        kind="review"
        close={() => setDecision(null)}
        save={save}
      />
    </>
  );
}
