"use client";
import { useTranslations } from "@repo/i18n";
import {
  Target1Icon as LocateFixed,
  MapPin1Icon as MapPin,
  MinusIcon as Minus,
  PlusIcon as Plus,
  ArrowRotateCounterclockwise1Icon as RotateCcw,
} from "@repo/ui/icons";
import { Button } from "@repo/ui/kit/Button";
import type { ClubDetailData } from "@repo/ui/kit/ClubDetail";
import { Skeleton } from "@repo/ui/kit/Skeleton";
import { toast } from "@repo/ui/kit/Sonner";
import { useEffect, useRef, useState } from "react";
import "./discovery-map.css";
import { loadMapSdk } from "./map-sdk";

type Point = [number, number]; // Leaflet: latitude, longitude (catalog uses longitude, latitude).
type Layer = {
  addTo(map: MapInstance): Layer;
  remove(): void;
  on(event: string, listener: () => void): Layer;
};
type MapInstance = {
  remove(): void;
  zoomIn(): void;
  zoomOut(): void;
  invalidateSize(): void;
  setView(point: Point, zoom: number, options?: object): MapInstance;
  fitBounds(points: Point[], options: object): void;
  panTo(point: Point, options: object): void;
};
type LeafletSdk = {
  map(element: HTMLElement, options: object): MapInstance;
  tileLayer(url: string, options: object): Layer;
  marker(point: Point, options: object): Layer;
  divIcon(options: object): unknown;
  control: { zoom(options: object): { addTo(map: MapInstance): void } };
};
declare global {
  interface Window {
    L?: LeafletSdk;
  }
}
const library = "/vendor/leaflet";
const validPoint = (
  point: ClubDetailData["coordinates"],
): point is [number, number] =>
  Boolean(
    point &&
    Number.isFinite(point[0]) &&
    Number.isFinite(point[1]) &&
    Math.abs(point[0]) <= 180 &&
    Math.abs(point[1]) <= 85,
  );

/** Lazy, token-free map; only visible tiles are requested and no tiles are cached offline. */
export function CatalogMap({
  clubs,
  selectedId,
  onSelect,
  recenter = 0,
}: {
  clubs: ClubDetailData[];
  selectedId: string;
  onSelect: (id: string) => void;
  recenter?: number;
}) {
  const t = useTranslations("DiscoveryMap");
  const container = useRef<HTMLDivElement>(null),
    map = useRef<MapInstance | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>()),
    select = useRef(onSelect);
  const [sdkReady, setSdkReady] = useState(false),
    [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [location, setLocation] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const [mapRevision, setMapRevision] = useState(0);
  const previous = useRef(selectedId),
    active = useRef(true);
  const lastRecenter = useRef(recenter);
  useEffect(() => {
    let alive = true;
    void loadMapSdk()
      .then(() => {
        if (alive) setSdkReady(true);
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [attempt]);
  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    if (!sdkReady || !container.current || !window.L) return;
    let alive = true;
    const sdk = window.L;
    const instance = sdk
      .map(container.current, {
        zoomControl: false,
        attributionControl: false,
        zoomAnimation: !matchMedia("(prefers-reduced-motion: reduce)").matches,
      })
      .setView([35.72, 51.4], 12);
    map.current = instance;
    const timeout = window.setTimeout(() => {
      if (alive) setStatus("error");
    }, 20000);
    // Browser caching is respected. No offline, prefetch, proxy or bulk tile requests.
    const tiles = sdk.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        minZoom: 4,
        keepBuffer: 0,
        updateWhenIdle: true,
        referrerPolicy: "strict-origin-when-cross-origin",
      },
    );
    let loadedTiles = 0;
    tiles.on("tileload", () => {
      loadedTiles += 1;
      window.clearTimeout(timeout);
      if (alive) setStatus("ready");
    });
    tiles
      .on("load", () => {
        window.clearTimeout(timeout);
        if (alive) setStatus(loadedTiles > 0 ? "ready" : "error");
      })
      .addTo(instance);
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(container.current);
    setMapRevision((v) => v + 1);
    return () => {
      alive = false;
      window.clearTimeout(timeout);
      observer.disconnect();
      instance.remove();
      map.current = null;
    };
  }, [sdkReady, attempt, t]);
  useEffect(() => {
    if (!map.current || !window.L) return;
    const sdk = window.L,
      instance = map.current,
      markers: Layer[] = [],
      elements = buttons.current;
    const points: Point[] = [];
    for (const club of clubs) {
      if (!validPoint(club.coordinates)) continue;
      const point: Point = [club.coordinates[1], club.coordinates[0]];
      points.push(point);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "discovery-map-marker";
      button.setAttribute("aria-label", `${club.name} · ${club.price}`);
      button.setAttribute("aria-pressed", String(club.id === selectedId));
      button.dataset.selected = String(club.id === selectedId);
      const image = document.createElement("img");
      image.src = club.photos[0]?.src ?? "/images/club-placeholder.svg";
      image.alt = "";
      image.addEventListener(
        "error",
        () => {
          image.src = "/images/club-placeholder.svg";
        },
        { once: true },
      );
      button.append(image);
      button.addEventListener("click", () => select.current(club.id));
      elements.set(club.id, button);
      markers.push(
        sdk
          .marker(point, {
            icon: sdk.divIcon({
              html: button,
              className: "gym-map-icon",
              iconSize: [50, 50],
              iconAnchor: [25, 50],
            }),
            keyboard: false,
          })
          .addTo(instance),
      );
    }
    if (points.length)
      instance.fitBounds(points, {
        paddingTopLeft: [40, 150],
        paddingBottomRight: [40, 300],
        maxZoom: 14,
        animate: false,
      });
    return () => {
      markers.forEach((m) => m.remove());
      elements.clear();
    };
    // Selection updates only marker states, without rebuilding or refitting results.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubs, mapRevision]);
  useEffect(() => {
    buttons.current.forEach((button, id) => {
      button.dataset.selected = String(id === selectedId);
      button.setAttribute("aria-pressed", String(id === selectedId));
    });
    const center = clubs.find((c) => c.id === selectedId)?.coordinates;
    if (selectedId !== previous.current && validPoint(center))
      map.current?.panTo([center[1], center[0]], { animate: false });
    previous.current = selectedId;
  }, [selectedId, clubs, mapRevision]);
  useEffect(() => {
    if (lastRecenter.current === recenter) return;
    lastRecenter.current = recenter;
    if (!recenter) return;
    const center = clubs.find((c) => c.id === selectedId)?.coordinates;
    if (validPoint(center))
      map.current?.setView([center[1], center[0]], 14, { animate: false });
  }, [recenter, clubs, selectedId]);
  function locate() {
    if (!navigator.geolocation) {
      setLocation("error");
      toast.error(t("locationDenied"));
      return;
    }
    setLocation("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!active.current) return;
        setLocation("idle");
        map.current?.setView(
          [position.coords.latitude, position.coords.longitude],
          14,
          { animate: false },
        );
      },
      () => {
        if (active.current) {
          setLocation("error");
          toast.error(t("locationDenied"));
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }
  return (
    <>
      <link
        rel="stylesheet"
        href={`${library}/leaflet.css`}
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin="anonymous"
      />
      <div
        ref={container}
        className="discovery-map-map"
        aria-label={t("mapLabel")}
      />
      <div className="discovery-map-attribution" dir="ltr">
        {t("copyright")}{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          {t("provider")}
        </a>
      </div>
      <div className="discovery-map-zoom">
        <Button
          variant="secondary"
          size="icon-lg"
          aria-label={t("zoomIn")}
          disabled={!sdkReady}
          onClick={() => map.current?.zoomIn()}
        >
          <Plus />
        </Button>
        <Button
          variant="secondary"
          size="icon-lg"
          aria-label={t("zoomOut")}
          disabled={!sdkReady}
          onClick={() => map.current?.zoomOut()}
        >
          <Minus />
        </Button>
      </div>
      <div className="discovery-map-locate">
        <Button
          variant="secondary"
          size="icon-lg"
          aria-label={t("myLocation")}
          disabled={location === "loading" || !sdkReady}
          onClick={locate}
        >
          <LocateFixed />
        </Button>
      </div>
      {status === "loading" && (
        <div
          className="discovery-map-skeleton"
          role="status"
          aria-label={t("loading")}
        >
          <Skeleton className="size-full rounded-none" aria-hidden="true" />
          <span className="sr-only">{t("loadingDescription")}</span>
        </div>
      )}
      {status === "error" && (
        <div className="discovery-map-mapState" role="status">
          <MapPin className="size-7" />
          <h2 className="text-lg font-semibold">
            {t(status === "error" ? "errorTitle" : "loading")}
          </h2>
          <p className="max-w-64 text-center text-sm leading-6 text-muted-foreground">
            {t(status === "error" ? "errorDescription" : "loadingDescription")}
          </p>
          {status === "error" && (
            <Button
              variant="outline"
              onClick={() => {
                setStatus("loading");
                setAttempt((v) => v + 1);
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
