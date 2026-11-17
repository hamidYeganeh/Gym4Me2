import { useState } from "react";

import type { ClubAssignment, ClubProfile, ClubSport } from "./club-profile";
import type { ClubResource } from "@repo/ui/lib/club-location-fields";

import { AnimatedSelectControl } from "@repo/ui/kit/select";
import { ClubLocationFields, emptyClubLocation } from "@repo/ui/lib/club-location-fields";

import { clubClasses } from "./club-classes";

export const profileCatalogs = [
  "types/club_types",
  "types/gallery_media_types",
  "locations/provinces",
  "locations/cities",
  "locations/districts",
  "locations/neighborhoods",
  "catalogs/sport_categories",
  "catalogs/sports",
  "catalogs/sub_sports",
  "catalogs/equipment",
  "catalogs/amenities",
] as const;

const ResourceSelect = (props: {
  title: string;
  value: string;
  options: ClubResource[];
  onChange: (id: string) => void;
  required?: boolean;
  labels?: Record<string, string>;
}) => {
  const { title, value, options, onChange, required, labels } = props;
  return (
    <div className={clubClasses.field}>
      <span>{title}</span>
      <AnimatedSelectControl
        required={required}
        value={value}
        onChange={onChange}
        items={[
          { value: "", label: required ? "Select" : "Optional" },
          ...(value && !options.some(({ id }) => id === value) ?
            [{ value, label: labels?.[value] ?? value }]
          : []),
          ...options.map(({ id, title }) => ({ value: id, label: title })),
        ]}
        triggerProps={{ "aria-label": title }}
      />
    </div>
  );
};

const FacilityFields = (props: {
  title: string;
  values: ClubAssignment[];
  options: ClubResource[];
  labels?: Record<string, string>;
  onChange: (items: ClubAssignment[]) => void;
}) => {
  const { title, values, options, labels, onChange } = props;
  const ids = new Set(values.map(({ id }) => id));
  return (
    <fieldset className="space-y-2">
      <legend>{title}</legend>
      {[
        ...options,
        ...values
          .filter(({ id }) => !options.some((item) => item.id === id))
          .map(({ id }) => ({ id, title: labels?.[id] ?? id })),
      ].map(({ id, title }) => (
        <div key={id}>
          <label>
            <input
              className="me-2"
              type="checkbox"
              checked={ids.has(id)}
              onChange={(event) =>
                onChange(
                  event.target.checked ?
                    [...values, { id, description: "" }]
                  : values.filter((item) => item.id !== id),
                )
              }
            />
            {title}
          </label>
          {ids.has(id) && (
            <label className={clubClasses.field}>
              Details for {title}
              <input
                maxLength={500}
                value={values.find((item) => item.id === id)?.description ?? ""}
                onChange={(event) =>
                  onChange(
                    values.map((item) =>
                      item.id === id ? { ...item, description: event.target.value } : item,
                    ),
                  )
                }
              />
            </label>
          )}
        </div>
      ))}
    </fieldset>
  );
};

export const ClubProfileFields = (props: {
  id: string;
  profile: ClubProfile;
  onChange: (profile: ClubProfile) => void;
  resources: Record<(typeof profileCatalogs)[number], ClubResource[]>;
  onUploadChange: (active: boolean) => void;
  onMediaUploaded: (item: NonNullable<ClubProfile["gallery"]>[number]) => void;
}) => {
  const { id, profile, onChange, resources, onUploadChange, onMediaUploaded } = props;
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const sports = profile.sports ?? [];
  const gallery = profile.gallery ?? [];
  const labels = profile.labels;
  const updateSport = (index: number, sport: ClubSport) =>
    onChange({
      ...profile,
      sports: sports.map((item, position) => (position === index ? sport : item)),
    });

  function moveMedia(from: number, to: number) {
    const item = gallery[from];
    if (!item || to < 0 || to >= gallery.length || from === to) return;
    const ordered = [...gallery];
    ordered.splice(from, 1);
    ordered.splice(to, 0, item);
    onChange({ ...profile, gallery: ordered });
  }

  async function upload(file: File) {
    if (file.size > 20 * 1024 * 1024) {
      setUploadError("Choose a file up to 20 MB.");
      return;
    }
    setUploading(true);
    onUploadChange(true);
    setUploadError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch(`/api/clubs/${id}/media`, { method: "POST", body });
      if (!response.ok) throw new Error("Could not upload the file.");
      const { hash, contentType } = (await response.json()) as {
        hash: string;
        contentType: string;
      };
      onMediaUploaded({
        hash,
        contentType,
        title: file.name.replace(/\.[^.]+$/, "").slice(0, 120),
        description: "",
        typeId:
          resources["types/gallery_media_types"].find(({ code }) =>
            contentType.startsWith(code + "/"),
          )?.id ?? "",
      });
    } catch {
      setUploadError("Could not upload the file. Use JPEG, PNG, WebP or MP4 and try again.");
    } finally {
      setUploading(false);
      onUploadChange(false);
    }
  }

  const location =
    typeof profile.location === "string" ?
      { ...emptyClubLocation, address: profile.location }
    : profile.location;
  const clubTypes = resources["types/club_types"];
  const clubTypeId =
    profile.clubTypeId ?? clubTypes.find(({ code }) => code === profile.type)?.id ?? "";
  const positionClass = "w-full rounded border border-current/30 p-2";

  return (
    <>
      <ResourceSelect
        title="Club type"
        value={clubTypeId}
        required
        options={clubTypes}
        labels={labels}
        onChange={(clubTypeId) => onChange({ ...profile, clubTypeId })}
      />
      <ClubLocationFields
        mapTiles={process.env.NEXT_PUBLIC_CLUB_MAP_TILES}
        mapAttribution={process.env.NEXT_PUBLIC_CLUB_MAP_ATTRIBUTION}
        value={location}
        onChange={(location) => onChange({ ...profile, location })}
        resources={resources}
        labels={labels}
        fieldClassName={positionClass}
      />
      <fieldset className="space-y-3">
        <legend>Sports</legend>
        {sports.length === 0 && <p>Add at least one sport.</p>}
        {sports.map((sport, index) => (
          <div className="space-y-2 rounded border border-current/20 p-3" key={index}>
            <ResourceSelect
              title="Category"
              value={sport.categoryId}
              required
              labels={labels}
              options={resources["catalogs/sport_categories"]}
              onChange={(categoryId) =>
                updateSport(index, { categoryId, sportId: "", subSportId: null })
              }
            />
            <ResourceSelect
              title="Sport"
              value={sport.sportId}
              required
              labels={labels}
              options={resources["catalogs/sports"].filter(
                ({ parentId }) => parentId === sport.categoryId,
              )}
              onChange={(sportId) => updateSport(index, { ...sport, sportId, subSportId: null })}
            />
            <ResourceSelect
              title="Sub-sport"
              value={sport.subSportId ?? ""}
              labels={labels}
              options={resources["catalogs/sub_sports"].filter(
                ({ parentId }) => parentId === sport.sportId,
              )}
              onChange={(subSportId) =>
                updateSport(index, { ...sport, subSportId: subSportId || null })
              }
            />
            <button
              className={clubClasses.action}
              type="button"
              onClick={() =>
                onChange({ ...profile, sports: sports.filter((_, position) => position !== index) })
              }
            >
              Remove sport
            </button>
          </div>
        ))}
        <button
          className={clubClasses.action}
          type="button"
          disabled={sports.length >= 60}
          onClick={() =>
            onChange({
              ...profile,
              sports: [...sports, { categoryId: "", sportId: "", subSportId: null }],
            })
          }
        >
          Add sport
        </button>
      </fieldset>
      <FacilityFields
        title="Equipment"
        values={profile.equipment ?? []}
        options={resources["catalogs/equipment"]}
        labels={labels}
        onChange={(equipment) => onChange({ ...profile, equipment })}
      />
      <FacilityFields
        title="Amenities"
        values={profile.amenities ?? []}
        options={resources["catalogs/amenities"]}
        labels={labels}
        onChange={(amenities) => onChange({ ...profile, amenities })}
      />
      <fieldset className="space-y-3" disabled={uploading}>
        <legend>Gallery</legend>
        {gallery.length > 0 && <p>The first item is featured in the app.</p>}
        {gallery.map((item, index) => {
          const source = `/api/clubs/${id}/media/${item.hash}`;
          const update = (changes: Partial<typeof item>) =>
            onChange({
              ...profile,
              gallery: gallery.map((entry, position) =>
                position === index ? { ...entry, ...changes } : entry,
              ),
            });
          return (
            <div
              className="space-y-2 rounded border border-current/20 p-3"
              key={`${item.hash}-${index}`}
            >
              {
                item.contentType.startsWith("video/") ?
                  <video className="max-h-48" controls preload="metadata" src={source} />
                  // eslint-disable-next-line @next/next/no-img-element -- Authenticated media redirects to a signed URL.
                : <img className="max-h-48 rounded" alt={item.title} src={source} />
              }
              <label className={clubClasses.field}>
                Title
                <input
                  required
                  maxLength={120}
                  value={item.title}
                  onChange={(event) => update({ title: event.target.value })}
                />
              </label>
              <label className={clubClasses.field}>
                Description
                <textarea
                  maxLength={500}
                  value={item.description}
                  onChange={(event) => update({ description: event.target.value })}
                />
              </label>
              <ResourceSelect
                title="Media type"
                value={item.typeId}
                labels={labels}
                required
                options={resources["types/gallery_media_types"].filter(
                  ({ code }) =>
                    !["image", "video"].includes(code) || item.contentType.startsWith(code + "/"),
                )}
                onChange={(typeId) => update({ typeId })}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  className={clubClasses.action}
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveMedia(index, 0)}
                >
                  Feature first
                </button>
                <button
                  className={clubClasses.action}
                  type="button"
                  disabled={index === gallery.length - 1}
                  onClick={() => moveMedia(index, index + 1)}
                >
                  Move down
                </button>
                <button
                  className={clubClasses.action}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...profile,
                      gallery: gallery.filter((_, position) => position !== index),
                    })
                  }
                >
                  Remove media
                </button>
              </div>
            </div>
          );
        })}
        <label className={clubClasses.field}>
          {uploading ? "Uploading…" : "Add photo or video"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4"
            disabled={gallery.length >= 24}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void upload(file);
            }}
          />
        </label>
        {uploadError && <p role="alert">{uploadError}</p>}
      </fieldset>
    </>
  );
};
