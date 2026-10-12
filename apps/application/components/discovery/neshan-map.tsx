"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { MapPin, Map as MapIcon, RotateCcw } from "lucide-react";
import { useTranslations } from "@repo/i18n";
import { Button } from "@repo/ui/kit/Button";
import type { ClubDetailData } from "@repo/ui/kit/ClubDetail";
import { clubMapPositions } from "../../lib/club-map";
import "./discovery-map.css";

type Coordinates = [number, number];
type MapInstance = {
  on: (event: string, listener: () => void) => void;
  remove: () => void;
  resize: () => void;
  fitBounds: (bounds: [Coordinates, Coordinates], options: object) => void;
  flyTo: (options: object) => void;
  addControl: (control: unknown, position: string) => void;
};
type MapMarker = {
  setLngLat: (position: Coordinates) => MapMarker;
  addTo: (map: MapInstance) => MapMarker;
  remove: () => void;
};
type NeshanSdk = {
  Map: (new (options: object) => MapInstance) & {
    mapTypes: { neshanVector: string };
  };
  Marker: new (options: { element: HTMLElement; anchor: string }) => MapMarker;
  NavigationControl: new (options: object) => unknown;
};

declare global {
  interface Window {
    nmp_mapboxgl?: NeshanSdk;
  }
}

const sdkUrl =
  "https://static.neshan.org/sdk/mapboxgl/v1.13.2/neshan-sdk/v1.1.3";
const mapKey = process.env.NEXT_PUBLIC_NESHAN_MAP_KEY;

export function NeshanMap({
  clubs,
  selectedId,
  onSelect,
}: {
  clubs: ClubDetailData[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations("DiscoveryMap");
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const markers = useRef(new Map<string, HTMLButtonElement>());
  const select = useRef(onSelect);
  const previousSelection = useRef(selectedId);
  const previousClubs = useRef(clubs);
  const [sdkReady, setSdkReady] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!sdkReady || !mapKey || !container.current || !window.nmp_mapboxgl)
      return;
    let instance: MapInstance;
    let observer: ResizeObserver | undefined;
    let active = true;
    const timeout = window.setTimeout(() => {
      if (active) setStatus("error");
    }, 20000);
    try {
      const sdk = window.nmp_mapboxgl;
      instance = new sdk.Map({
        container: container.current,
        mapKey,
        mapType: sdk.Map.mapTypes.neshanVector,
        center: [51.433, 35.808],
        zoom: 12.8,
        minZoom: 5,
        maxZoom: 19,
        pitch: 0,
        poi: false,
        traffic: false,
        trackResize: true,
      });
      map.current = instance;
      instance.on("load", () => {
        window.clearTimeout(timeout);
        if (active) setStatus("ready");
      });
      instance.on("error", () => {
        if (active) setStatus("error");
      });
      instance.addControl(
        new sdk.NavigationControl({ showCompass: false }),
        "bottom-right",
      );
      observer = new ResizeObserver(() => instance.resize());
      observer.observe(container.current);
    } catch {
      window.clearTimeout(timeout);
      queueMicrotask(() => {
        if (active) setStatus("error");
      });
    }
    return () => {
      active = false;
      window.clearTimeout(timeout);
      observer?.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, [sdkReady, attempt]);

  useEffect(() => {
    if (!map.current || !window.nmp_mapboxgl) return;
    const instance = map.current;
    const sdk = window.nmp_mapboxgl;
    const created: MapMarker[] = [];
    clubs.forEach((club) => {
      const position = clubMapPositions[club.id];
      if (!position) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "discovery-map-marker";
      button.textContent = club.price;
      button.dir = club.locale.startsWith("fa") ? "rtl" : "ltr";
      button.setAttribute("aria-label", `${club.name} · ${club.price}`);
      button.addEventListener("click", () => select.current(club.id));
      markers.current.set(club.id, button);
      created.push(
        new sdk.Marker({ element: button, anchor: "bottom" })
          .setLngLat(position)
          .addTo(instance),
      );
    });
    const positions = clubs.flatMap((club) =>
      clubMapPositions[club.id] ? [clubMapPositions[club.id]!] : [],
    );
    if (positions.length) {
      instance.fitBounds(
        [
          [
            Math.min(...positions.map((p) => p[0])),
            Math.min(...positions.map((p) => p[1])),
          ],
          [
            Math.max(...positions.map((p) => p[0])),
            Math.max(...positions.map((p) => p[1])),
          ],
        ],
        {
          padding: { top: 180, bottom: 260, left: 60, right: 60 },
          maxZoom: 14,
          duration: 500,
        },
      );
    }
    const elements = markers.current;
    return () => {
      created.forEach((marker) => marker.remove());
      elements.clear();
    };
  }, [clubs, sdkReady, attempt]);

  useEffect(() => {
    markers.current.forEach((button, id) => {
      button.dataset.selected = String(id === selectedId);
      button.setAttribute("aria-pressed", String(id === selectedId));
    });
    const center = clubMapPositions[selectedId];
    // Preserve the bounds of filtered results; pan only when the user selects a club.
    if (
      center &&
      selectedId !== previousSelection.current &&
      clubs === previousClubs.current
    ) {
      map.current?.flyTo({ center, duration: 600, essential: false });
    }
    previousSelection.current = selectedId;
    previousClubs.current = clubs;
  }, [selectedId, clubs, sdkReady, attempt]);

  const missingKey = !mapKey;
  return (
    <>
      {mapKey && (
        <>
          <link rel="stylesheet" href={`${sdkUrl}/index.css`} />
          <Script
            src={`${sdkUrl}/index.js`}
            strategy="afterInteractive"
            onReady={() => setSdkReady(true)}
            onError={() => setStatus("error")}
          />
        </>
      )}
      <div
        ref={container}
        className={"discovery-map-map"}
        aria-label={t("mapLabel")}
      />
      {(missingKey || status !== "ready") && (
        <div className={"discovery-map-mapState"} role="status">
          <span className="flex size-16 items-center justify-center rounded-3xl bg-primary/15 text-primary">
            {missingKey ? (
              <MapIcon className="size-7" />
            ) : (
              <MapPin className="size-7" />
            )}
          </span>
          <h2 className="text-lg font-semibold">
            {t(
              missingKey
                ? "setupTitle"
                : status === "error"
                  ? "errorTitle"
                  : "loading",
            )}
          </h2>
          <p className="max-w-64 text-center text-sm leading-6 text-muted-foreground">
            {t(
              missingKey
                ? "setupDescription"
                : status === "error"
                  ? "errorDescription"
                  : "loadingDescription",
            )}
          </p>
          {!missingKey && status === "error" && (
            <Button
              variant="outline"
              onClick={() => {
                setStatus("loading");
                if (sdkReady) setAttempt((value) => value + 1);
                else window.location.reload();
              }}
            >
              <RotateCcw />
              {t("retry")}
            </Button>
          )}
        </div>
      )}
    </>
  );
}
