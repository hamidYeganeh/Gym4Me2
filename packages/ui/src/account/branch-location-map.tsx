"use client";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { useTranslations } from "@repo/i18n";
import "leaflet/dist/leaflet.css";
export function BranchLocationMap({
  value,
  onChange,
  disabled,
}: {
  value: [number, number] | null;
  onChange: (value: [number, number]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("BusinessFlow");
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const marker = useRef<Leaflet.Marker | null>(null);
  const callback = useRef(onChange);
  callback.current = onChange;
  const locked = useRef(disabled);
  locked.current = disabled;
  const initial = useRef(value);
  const [error, setError] = useState(false);
  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;
    void import("leaflet")
      .then((L) => {
        if (disposed || !container.current) return;
        const point = initial.current ?? [32.4279, 53.688];
        const instance = L.map(container.current, {
          scrollWheelZoom: false,
        }).setView(point, initial.current ? 15 : 5);
        map.current = instance;
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        })
          .addTo(instance)
          .on("tileerror", () => setError(true))
          .on("load", () => setError(false));
        const pin = L.marker(point, {
          draggable: !locked.current,
          opacity: initial.current ? 1 : 0,
          icon: L.divIcon({
            className: "",
            html: '<span style="display:block;width:24px;height:24px;border-radius:50% 50% 50% 0;background:var(--primary);transform:rotate(-45deg);box-shadow:0 3px 12px #0005"></span>',
            iconSize: [24, 24],
            iconAnchor: [12, 24],
          }),
        }).addTo(instance);
        marker.current = pin;
        instance.on("click", (event: Leaflet.LeafletMouseEvent) => {
          if (locked.current) return;
          const point = event.latlng.wrap();
          pin.setLatLng(point).setOpacity(1);
          callback.current([point.lat, point.lng]);
        });
        pin.on("dragend", () => {
          if (locked.current) return;
          const p = pin.getLatLng().wrap();
          pin.setLatLng(p);
          callback.current([p.lat, p.lng]);
        });
        observer = new ResizeObserver(() => instance.invalidateSize());
        observer.observe(container.current);
      })
      .catch(() => setError(true));
    return () => {
      disposed = true;
      observer?.disconnect();
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
  }, []);
  useEffect(() => {
    if (
      !value ||
      !Number.isFinite(value[0]) ||
      !Number.isFinite(value[1]) ||
      Math.abs(value[0]) > 90 ||
      Math.abs(value[1]) > 180
    )
      return;
    marker.current?.setLatLng(value).setOpacity(1);
    map.current?.panTo(value, { animate: false });
  }, [value?.[0], value?.[1]]);
  useEffect(() => {
    if (disabled) marker.current?.dragging?.disable();
    else marker.current?.dragging?.enable();
  }, [disabled]);
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">{t("mapHint")}</p>
      <div
        ref={container}
        role="region"
        aria-label={t("mapLabel")}
        className="relative z-0 h-80 w-full overflow-hidden rounded-2xl bg-muted"
      />
      {error && (
        <p role="status" className="text-sm text-muted-foreground">
          {t("mapUnavailable")}
        </p>
      )}
    </div>
  );
}
