"use client";

import { useState } from "react";
import { useTranslations } from "@repo/i18n";
import {
  useAccountLocation,
  useUpdateAccountLocation,
} from "@repo/api/profile";
import type { DiscoveryLocationDto } from "@repo/api/catalog";
import { LocationExplorer } from "@repo/ui/kit/LocationExplorer";
import { MapPin1Icon } from "@repo/ui/icons";
import { FitnessNote } from "@repo/ui/kit/FitnessIllustration";
import { Button } from "@repo/ui/kit/Button";
import { preferredDiscoveryLocation } from "@repo/ui/lib/discovery-location";
import styles from "./LandingLocationsSection.module.css";

export function LandingLocationsSection() {
  const t = useTranslations("Website.locations");
  const copy = useTranslations("LocationDiscovery");
  const account = useAccountLocation();
  const save = useUpdateAccountLocation();
  const guest = account.error?.status === 401 || account.error?.status === 403;
  const owner = guest ? "guest" : account.data?.userId;
  const [choice, setChoice] = useState<{
    owner?: string;
    value: DiscoveryLocationDto;
  }>();
  const value = preferredDiscoveryLocation(
    choice?.owner === owner ? choice?.value : undefined,
    guest ? null : account.data?.location,
  );
  function choose(location: DiscoveryLocationDto) {
    setChoice({ owner, value: location });
    if (account.data && !account.error && location.provinceId)
      save.mutate({
        countryId: location.countryId,
        provinceId: location.provinceId,
        cityId: location.cityId ?? null,
        districtId: location.districtId ?? null,
      });
  }
  return (
    <section
      id="locations"
      className={styles.section}
      aria-labelledby="locations-title"
    >
      <div className={styles.inner}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>
              <MapPin1Icon aria-hidden="true" />
              {t("label")}
            </p>
            <h2 id="locations-title">{t("headline")}</h2>
            <p className={styles.description}>{t("description")}</p>
          </div>
        </div>
        {account.isError && !guest ? (
          <p role="alert">
            {copy("profileError")}{" "}
            <button
              type="button"
              className="min-h-11 underline"
              onClick={() => void account.refetch()}
            >
              {copy("retry")}
            </button>
          </p>
        ) : (
          <LocationExplorer
            key={owner ?? "pending"}
            value={value}
            randomize={guest}
            ready={!account.isPending}
            onChange={choose}
            saving={save.isPending}
          />
        )}
        {save.isError && (
          <p role="alert" className="text-sm text-destructive">
            {copy("saveError")}{" "}
            <button
              type="button"
              className="min-h-11 underline"
              onClick={() => choose(value)}
            >
              {copy("retry")}
            </button>
          </p>
        )}
        <FitnessNote
          className="mt-8"
          illustration="treadmill"
          title={t("appNoteTitle")}
          description={t("continueDescription")}
          action={
            <Button asChild variant="outline">
              <a href="#download">{t("continue")}</a>
            </Button>
          }
        />
      </div>
    </section>
  );
}
