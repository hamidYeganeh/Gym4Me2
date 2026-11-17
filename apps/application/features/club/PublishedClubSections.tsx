"use client";

import type { PublicClub } from "./api";

import { useTranslations } from "@repo/i18n";

import { clubMediaUrl } from "./api";
import styles from "./sections.module.css";

const PublishedClubSections = (props: { club: PublicClub }) => {
  const { club } = props;
  const t = useTranslations("Club");
  const label = (id: string | null) => (id ? club.labels[id] : undefined);
  const location = club.location;
  const maps = `https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=17/${location.lat}/${location.lng}`;
  const videos = club.gallery.filter((item) => item.contentType.startsWith("video/"));
  return (
    <div className={styles.sections}>
      <section id="club-sports" className={styles.section}>
        <h2>{t("sports")}</h2>
        <ul>
          {club.sports.map(({ sportId, categoryId, subSportId }) => (
            <li key={`${sportId}/${subSportId ?? ""}`}>
              {[categoryId, sportId, subSportId].map(label).filter(Boolean).join(" / ")}
            </li>
          ))}
        </ul>
      </section>
      {club.equipment.length > 0 && (
        <section id="club-equipment" className={styles.section}>
          <h2>{t("equipment")}</h2>
          <ul>
            {club.equipment.map(({ id, description }) => (
              <li key={id}>
                {label(id)}
                {description && ` · ${description}`}
              </li>
            ))}
          </ul>
        </section>
      )}
      {videos.length > 0 && (
        <section className={styles.section}>
          <h2>{t("videos")}</h2>
          {videos.map((item) => (
            <figure key={item.hash}>
              <video
                className="w-full"
                controls
                preload="metadata"
                src={clubMediaUrl(club.id, item.hash)}
                aria-label={item.title}
              />
              <figcaption>
                {item.title}
                {item.description && <p>{item.description}</p>}
              </figcaption>
            </figure>
          ))}
        </section>
      )}
      <section id="club-location" className={styles.section}>
        <h2>{t("location")}</h2>
        <p>
          {[location.provinceId, location.cityId, location.districtId, location.neighborhoodId]
            .map(label)
            .filter(Boolean)
            .join("، ")}
        </p>
        <p>{location.address}</p>
        <a href={maps} target="_blank" rel="noreferrer" className="underline">
          {t("viewMap")}
        </a>
      </section>
    </div>
  );
};
export default PublishedClubSections;
