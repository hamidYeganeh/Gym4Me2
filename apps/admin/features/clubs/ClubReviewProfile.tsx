import { Toast } from "@base-ui/react/toast";

import { useLocale, useTranslations } from "@repo/i18n";
import { AnimatedButton } from "@repo/ui/kit/button";
import { ClubPinMap } from "@repo/ui/lib/club-pin-map";

type Location = {
  address: string;
  lat: number;
  lng: number;
  provinceId: string;
  cityId: string;
  districtId: string | null;
  neighborhoodId: string | null;
};

export type ReviewProfile = {
  name: string;
  type: string;
  clubTypeId?: string;
  location: string | Location;
  description: string;
  cover?: string;
  logo?: string;
  labels?: Record<string, string>;
  sports?: { categoryId: string; sportId: string; subSportId: string | null }[];
  equipment?: { id: string; description: string }[];
  amenities?: { id: string; description: string }[];
  gallery?: {
    hash: string;
    title: string;
    description: string;
    typeId: string;
    contentType: string;
  }[];
};

function mapPoint(location: ReviewProfile["location"]) {
  return (
      location &&
        typeof location !== "string" &&
        Number.isFinite(location.lat) &&
        Math.abs(location.lat) <= 90 &&
        Number.isFinite(location.lng) &&
        Math.abs(location.lng) <= 180
    ) ?
      location
    : null;
}

export const ClubLocationActions = (props: { location: ReviewProfile["location"] }) => {
  const { location } = props;
  const toast = Toast.useToastManager();
  const t = useTranslations("ClubRequests");
  const address = typeof location === "string" ? location : location?.address;
  const point = mapPoint(location);
  if (!address && !point) return null;

  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      toast.add({ title: t("addressCopied") });
    } catch {
      toast.add({ title: t("addressCopyError"), type: "error" });
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {address && (
        <AnimatedButton
          size="sm"
          variant="outlined"
          color="neutral"
          onClick={() => void copyAddress()}
        >
          {t("copyAddress")}
        </AnimatedButton>
      )}
      {point && (
        <AnimatedButton asChild size="sm" variant="outlined" color="neutral">
          <a
            target="_blank"
            rel="noreferrer"
            href={`https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lng}#map=16/${point.lat}/${point.lng}`}
          >
            {t("openMap")}
          </a>
        </AnimatedButton>
      )}
    </div>
  );
};

export const ClubReviewProfile = (props: { profile: ReviewProfile; clubId?: string }) => {
  const { profile, clubId } = props;
  const { location, labels } = profile;
  const locale = useLocale();
  const t = useTranslations("ClubRequests");
  const point = mapPoint(location);
  const name = (id: string | null) => (id ? (labels?.[id] ?? id) : null);
  return (
    <>
      <dl className="grid gap-3 text-sm">
        <div className="grid gap-1">
          <dt className="text-theme-muted-foreground">{t("type")}</dt>
          <dd>
            <bdi>{name(profile.clubTypeId ?? null) ?? (profile.type || "—")}</bdi>
          </dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-theme-muted-foreground">{t("address")}</dt>
          <dd>
            <bdi>{(typeof location === "string" ? location : location?.address) || "—"}</bdi>
          </dd>
        </div>
      </dl>
      {point && (
        <div className="grid gap-2">
          <div className="overflow-hidden rounded-xl border border-theme-border" dir="ltr">
            <ClubPinMap
              key={`${point.lat},${point.lng}`}
              lat={point.lat}
              lng={point.lng}
              persian={locale === "fa"}
            />
          </div>
        </div>
      )}
      {clubId && (
        <>
          {profile.sports?.length ?
            <div>
              <h3>Sports</h3>
              <ul>
                {profile.sports.map(({ categoryId, sportId, subSportId }) => (
                  <li key={`${sportId}/${subSportId ?? ""}`}>
                    {[categoryId, sportId, subSportId].map(name).filter(Boolean).join(" / ")}
                  </li>
                ))}
              </ul>
            </div>
          : null}
          {(["equipment", "amenities"] as const).map((key) =>
            profile[key]?.length ?
              <div key={key}>
                <h3 className="capitalize">{key}</h3>
                <ul>
                  {profile[key].map(({ id, description }) => (
                    <li key={id}>
                      {name(id)}
                      {description && ` · ${description}`}
                    </li>
                  ))}
                </ul>
              </div>
            : null,
          )}
          {(
            [
              ["Cover", profile.cover],
              ["Logo", profile.logo],
            ] as const
          ).map(
            ([label, url]) =>
              url && (
                <a className="underline" key={label} href={url} target="_blank" rel="noreferrer">
                  {label}
                </a>
              ),
          )}
          {profile.gallery?.length ?
            <div className="space-y-3">
              <h3>Gallery</h3>
              {profile.gallery.map((item, index) => {
                const src = `/api/club-publications/${clubId}/media/${item.hash}`;
                return (
                  <figure key={`${item.hash}-${index}`}>
                    {
                      item.contentType.startsWith("video/") ?
                        <video className="max-h-48" controls preload="metadata" src={src} />
                        // eslint-disable-next-line @next/next/no-img-element -- Media redirects to a signed URL.
                      : <img
                          className="max-h-48 rounded"
                          loading="lazy"
                          src={src}
                          alt={item.title}
                        />

                    }
                    <figcaption>
                      {item.title} · {name(item.typeId)}
                      {item.description && ` · ${item.description}`}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          : null}
        </>
      )}
    </>
  );
};
