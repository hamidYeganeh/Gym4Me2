"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useRef, useState } from "react";

import type { CircleMarker } from "leaflet";

type Point = { lat: number | null; lng: number | null };

export const ClubPinMap = (
  props: Point & {
    onPick?: (lat: number, lng: number) => void;
    persian: boolean;
    tiles?: string;
    attribution?: string;
  },
) => {
  const { lat, lng, onPick, persian, tiles, attribution } = props;
  const host = useRef<HTMLDivElement>(null);
  const marker = useRef<CircleMarker | null>(null);
  const latest = useRef({ lat, lng, onPick });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    latest.current = { lat, lng, onPick };
    if (lat != null && lng != null)
      marker.current?.setLatLng([lat, lng]).setStyle({ opacity: 1, fillOpacity: 0.8 });
    else marker.current?.setStyle({ opacity: 0, fillOpacity: 0 });
  }, [lat, lng, onPick]);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    let closed = false;
    void import("leaflet")
      .then(({ map, tileLayer, circleMarker }) => {
        if (closed || !host.current) return;
        const selected = latest.current.lat != null && latest.current.lng != null;
        const point: [number, number] = [
          latest.current.lat ?? 35.6892,
          latest.current.lng ?? 51.389,
        ];
        const widget = map(host.current, { scrollWheelZoom: false }).setView(
          point,
          selected ? 15 : 6,
        );
        const resize = new ResizeObserver(() => widget.invalidateSize({ pan: false }));
        resize.observe(host.current);
        dispose = () => {
          resize.disconnect();
          widget.remove();
        };
        tileLayer(tiles ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            attribution ??
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
          maxZoom: 19,
        }).addTo(widget);
        marker.current = circleMarker(point, {
          radius: 9,
          weight: 3,
          color: "#fff",
          fillColor: "#3b82f6",
          opacity: selected ? 1 : 0,
          fillOpacity: selected ? 0.8 : 0,
        }).addTo(widget);
        if (latest.current.onPick) {
          widget.on("click", ({ latlng }) => {
            const { lat, lng } = latlng.wrap();
            latest.current.onPick?.(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
          });
        }
      })
      .catch(() => {
        if (!closed) setFailed(true);
      });
    return () => {
      closed = true;
      marker.current = null;
      dispose?.();
    };
  }, [tiles, attribution]);

  if (failed)
    return (
      <p role="alert">
        {onPick ?
          persian ?
            "نقشه در دسترس نیست. مختصات را وارد کنید."
          : "The map is unavailable. Enter the coordinates below."
        : persian ?
          "نقشه در دسترس نیست."
        : "The map is unavailable."}
      </p>
    );
  return (
    <div
      ref={host}
      role="region"
      aria-label={
        onPick ?
          persian ?
            "انتخاب موقعیت روی نقشه"
          : "Select the club location on a map"
        : persian ?
          "موقعیت باشگاه روی نقشه"
        : "Club location on a map"
      }
      className="relative isolate h-64 w-full rounded"
    />
  );
};
