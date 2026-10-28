"use client";
import {
  catalogSelectSource,
  useLocations,
  type GeographyKind,
} from "@repo/api/catalog";
import { useEffect } from "react";
import { useTranslations } from "@repo/i18n";
import { NativeSelect, NativeSelectOption } from "@repo/ui/kit/NativeSelect";
import { Field, FieldLabel } from "@repo/ui/kit/Field";
import { LocationCard } from "@repo/ui/kit/LocationCard";
import { locationCover } from "@repo/ui/lib/location-cover";
import type { CatalogLocation } from "../../lib/catalog-location";
export type LocationValue = CatalogLocation;
export function LocationPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: LocationValue;
  onChange: (location: LocationValue) => void;
  disabled?: boolean;
}) {
  const countries = useLocations("countries");
  const iran = countries.data?.find(
    (country) => /^(iran|ایران)$/i.test(country.name) || country.code === "IR",
  );
  const country = iran?.id ?? "";
  useEffect(() => {
    if (country && value.countryId !== country)
      onChange({ countryId: country });
  }, [country, value.countryId, onChange]);
  const {
    provinceId: province = "",
    cityId: city = "",
    districtId: district = "",
  } = value;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <LocationSelect
        kind="provinces"
        disabled={disabled}
        parentId={country}
        value={province}
        onChange={(id) => {
          onChange({ countryId: country, provinceId: id || undefined });
        }}
      />
      <LocationSelect
        kind="cities"
        disabled={disabled}
        parentId={province}
        value={city}
        onChange={(id) => {
          onChange({
            countryId: country,
            provinceId: province,
            cityId: id || undefined,
          });
        }}
      />
      <LocationSelect
        kind="districts"
        disabled={disabled}
        parentId={city}
        value={district}
        onChange={(id) => {
          onChange({ ...value, districtId: id || undefined });
        }}
      />
    </div>
  );
}
function LocationSelect({
  kind,
  parentId,
  value,
  onChange,
  disabled,
}: {
  kind: GeographyKind;
  parentId?: string;
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("Catalog");
  return (
    <Field>
      <FieldLabel htmlFor={`discovery-${kind}`}>{t(kind)}</FieldLabel>
      <NativeSelect
        id={`discovery-${kind}`}
        value={value}
        optionsSource={catalogSelectSource(kind, parentId)}
        disabled={disabled || (kind !== "countries" && !parentId)}
        optionsClassName="grid! grid-cols-2 gap-3!"
        optionsFooter={
          <a
            href="/images/locations/credits.txt"
            target="_blank"
            rel="noreferrer"
            className="mt-4 block py-2 text-xs text-muted-foreground underline underline-offset-4"
          >
            {t("photoCredits")}
          </a>
        }
        renderOption={(choice, { selected, active, select, buttonProps }) =>
          choice.value ? (
            <LocationCard
              name={choice.label}
              {...locationCover(choice.label)}
              kindLabel={t(kind)}
              clubCount={choice.clubCount}
              className="w-full!"
              selected={selected}
              active={active}
              selectionProps={buttonProps}
              onSelect={select}
            />
          ) : (
            <button
              {...buttonProps}
              type="button"
              onClick={select}
              className="col-span-2 min-h-12 rounded-2xl bg-muted px-4 text-start text-sm aria-selected:bg-primary/10"
            >
              {choice.label}
            </button>
          )
        }
        onChange={(event) => onChange(event.target.value)}
      >
        <NativeSelectOption value="">{t("allLocations")}</NativeSelectOption>
      </NativeSelect>
    </Field>
  );
}
