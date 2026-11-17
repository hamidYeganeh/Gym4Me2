"use client";

import { useEffect, useState } from "react";

import { ClubPinMap } from "./club-pin-map";

export type ClubResource = {
  id: string;
  title: string;
  code: string;
  parentId: string | null;
  active: boolean;
};

export type ClubLocation = {
  address: string;
  lat: number | null;
  lng: number | null;
  provinceId: string;
  cityId: string;
  districtId: string | null;
  neighborhoodId: string | null;
};

export const emptyClubLocation: ClubLocation = {
  address: "",
  lat: null,
  lng: null,
  provinceId: "",
  cityId: "",
  districtId: null,
  neighborhoodId: null,
};

const geographies = [
  { kind: "provinces", key: "provinceId", parent: null },
  { kind: "cities", key: "cityId", parent: "provinceId" },
  { kind: "districts", key: "districtId", parent: "cityId" },
  { kind: "neighborhoods", key: "neighborhoodId", parent: "districtId" },
] as const;

export function useClubResources<Path extends string>(origin: string, paths: readonly Path[]) {
  const [resources, setResources] = useState<Record<Path, ClubResource[]> | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    void Promise.all(
      paths.map(async (path) => {
        const response = await fetch(`${origin}/${path}`, {
          signal: abort.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Resource catalog unavailable.");
        return [path, (await response.json()) as ClubResource[]] as const;
      }),
    )
      .then((items) => setResources(Object.fromEntries(items) as Record<Path, ClubResource[]>))
      .catch(() => {
        if (!abort.signal.aborted) setError(true);
      });
    return () => abort.abort();
  }, [origin, paths]);
  return { resources, error };
}

export const ClubLocationFields = (props: {
  value: ClubLocation;
  onChange: (value: ClubLocation) => void;
  resources: Record<string, ClubResource[]>;
  fieldClassName?: string;
  labels?: Record<string, string>;
  persian?: boolean;
  mapTiles?: string;
  mapAttribution?: string;
}) => {
  const {
    value,
    onChange,
    resources,
    fieldClassName,
    labels = {},
    persian = false,
    mapTiles,
    mapAttribution,
  } = props;
  const [showMap, setShowMap] = useState(false);
  const captions =
    persian ?
      ["استان", "شهر", "منطقه", "محله", "آدرس", "عرض جغرافیایی", "طول جغرافیایی"]
    : ["Province", "City", "District", "Neighborhood", "Address", "Latitude", "Longitude"];

  return (
    <>
      {geographies.map(({ kind, key, parent: parentKey }, index) => {
        const parent = parentKey ? value[parentKey] : undefined;
        const options = (resources[`locations/${kind}`] ?? []).filter(
          (item) => index === 0 || item.parentId === parent,
        );
        const current = value[key];
        const required = index < 2;
        if (!required && !current && !options.length) return null;

        return (
          <label key={kind} className="block">
            {captions[index]}
            <select
              className={fieldClassName}
              required={required}
              value={current ?? ""}
              onChange={(event) => {
                const next = { ...value, [key]: event.target.value || (required ? "" : null) };
                if (index < 1) next.cityId = "";
                if (index < 2) next.districtId = null;
                if (index < 3) next.neighborhoodId = null;
                onChange(next);
              }}
            >
              <option value="">
                {required ?
                  persian ?
                    "انتخاب کنید"
                  : "Select"
                : persian ?
                  "اختیاری"
                : "Optional"}
              </option>
              {current && !options.some(({ id }) => id === current) && (
                <option value={current}>{labels[current] ?? current}</option>
              )}
              {options.map(({ id, title }) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
          </label>
        );
      })}
      <label className="block">
        {captions[4]}
        <input
          className={fieldClassName}
          required
          maxLength={180}
          value={value.address}
          onChange={(event) => onChange({ ...value, address: event.target.value })}
        />
      </label>
      <button
        type="button"
        className="underline"
        aria-expanded={showMap}
        onClick={() => setShowMap(!showMap)}
      >
        {showMap ?
          persian ?
            "بستن نقشه"
          : "Close map"
        : persian ?
          "انتخاب پین روی نقشه"
        : "Place a pin on the map"}
      </button>
      {showMap && (
        <ClubPinMap
          lat={value.lat}
          lng={value.lng}
          persian={persian}
          tiles={mapTiles}
          attribution={mapAttribution}
          onPick={(lat, lng) => onChange({ ...value, lat, lng })}
        />
      )}
      {(["lat", "lng"] as const).map((key, index) => (
        <label key={key} className="block">
          {captions[index + 5]}
          <input
            className={fieldClassName}
            type="number"
            step="any"
            required
            min={index ? -180 : -90}
            max={index ? 180 : 90}
            value={value[key] ?? ""}
            onChange={(event) =>
              onChange({
                ...value,
                [key]:
                  Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : null,
              })
            }
          />
        </label>
      ))}
    </>
  );
};
