"use client";

import { useTheme } from "@repo/theme/provider";
import { useEffect, useRef, useState } from "react";
import type { Map as NeshanMap } from "@neshan-maps-platform/maplibre-sdk";
import type { BranchProfileDto } from "@repo/api/catalog";
import { useTranslations } from "@repo/i18n";
import {
  ArrowUpRightIcon,
  MapPin1Icon,
  MinusIcon,
  PlusIcon,
  Target1Icon,
} from "@repo/ui/icons";
import "@neshan-maps-platform/maplibre-sdk/style.css";
import "./club-location-card.css";

export function ClubLocationCard({ branch }: { branch: BranchProfileDto }) {
  const { resolvedTheme } = useTheme();
  const t = useTranslations("ClubLocation");
  const controls = useTranslations("DiscoveryMap");
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<NeshanMap | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);
  const [latitude, longitude] = branch.location.coordinates ?? [];
  const hasLocation =
    latitude !== undefined &&
    longitude !== undefined &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;

  useEffect(() => {
    const element = container.current;
    const apiKey = process.env.NEXT_PUBLIC_NESHAN_MAP_KEY;
    if (!element || !hasLocation || !apiKey) return;
    let cancelled = false;
    let resize: ResizeObserver | undefined;
    let instance: NeshanMap | undefined;
    const timeout = window.setTimeout(() => {
      if (!cancelled) setStatus("error");
    }, 20000);
    import("@neshan-maps-platform/maplibre-sdk")
      .then(({ default: sdk }) => {
        if (cancelled) return;
        instance = new sdk.Map({
          container: element,
          apiKey,
          style: `https://static.neshan.org/sdk/maplibre/styles/monochrome_${resolvedTheme === "dark" ? "dark" : "light"}.json`,
          center: [longitude!, latitude!],
          zoom: 15,
          cooperativeGestures: true,
          attributionControl: false,
        });
        map.current = instance;
        instance.scrollZoom.disable();
        instance.dragRotate.disable();
        instance.touchZoomRotate.disableRotation();
        new sdk.Marker({
          color: getComputedStyle(element).getPropertyValue("--primary").trim(),
        })
          .setLngLat([longitude!, latitude!])
          .addTo(instance);
        instance.on("load", () => {
          if (!cancelled) {
            clearTimeout(timeout);
            setStatus("ready");
          }
        });
        instance.on("error", () => {
          if (!cancelled) setStatus("error");
        });
        resize = new ResizeObserver(() => instance?.resize());
        resize.observe(element);
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      resize?.disconnect();
      instance?.remove();
      map.current = null;
    };
  }, [latitude, longitude, hasLocation, attempt, resolvedTheme]);

  const unavailable =
    !hasLocation ||
    !process.env.NEXT_PUBLIC_NESHAN_MAP_KEY ||
    status === "error";
  return (
    <section className="club-location-card" aria-label={t("title")}>
      <div
        ref={container}
        className="club-location-map"
        aria-label={t("map", { branch: branch.name })}
      />
      {!unavailable && (
        <>
          <div className="club-location-zoom">
            <button
              type="button"
              disabled={status !== "ready"}
              aria-label={controls("zoomIn")}
              onClick={() => map.current?.zoomIn()}
            >
              <PlusIcon />
            </button>
            <button
              type="button"
              disabled={status !== "ready"}
              aria-label={controls("zoomOut")}
              onClick={() => map.current?.zoomOut()}
            >
              <MinusIcon />
            </button>
          </div>
          <button
            type="button"
            className="club-location-center"
            disabled={status !== "ready"}
            aria-label={controls("recenter")}
            onClick={() =>
              map.current?.easeTo({
                center: [longitude!, latitude!],
                zoom: 15,
                duration: window.matchMedia("(prefers-reduced-motion: reduce)")
                  .matches
                  ? 0
                  : 600,
              })
            }
          >
            <Target1Icon />
          </button>
        </>
      )}
      {(unavailable || status === "loading") && (
        <div className="club-location-status" role="status">
          <MapPin1Icon className="size-9" />
          <p>
            {!hasLocation
              ? t("noLocation")
              : unavailable
                ? controls("errorTitle")
                : controls("loading")}
          </p>
          {hasLocation && status === "error" && (
            <button
              type="button"
              onClick={() => {
                setStatus("loading");
                setAttempt((value) => value + 1);
              }}
            >
              {controls("retry")}
            </button>
          )}
        </div>
      )}
      <div className="club-location-footer">
        <div className="min-w-0 flex-1">
          <p className="club-location-eyebrow">
            <MapPin1Icon />
            {t("title")}
          </p>
          <h3>{branch.name}</h3>
          <p className="club-location-address">
            {branch.location.address || t("noAddress")}
          </p>
        </div>
        {hasLocation && (
          <a
            className="club-location-directions"
            href={`https://neshan.org/maps?destination=${latitude},${longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("directions")}
          >
            <ArrowUpRightIcon />
            <span>{t("directions")}</span>
          </a>
        )}
      </div>
    </section>
  );
}
