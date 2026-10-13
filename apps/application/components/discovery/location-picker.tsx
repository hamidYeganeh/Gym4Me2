"use client";
import { useLocations, type GeographyKind } from "@repo/api/catalog";
import { useTranslations } from "@repo/i18n";
import { NativeSelect, NativeSelectOption } from "@repo/ui/kit/NativeSelect";
import { Field, FieldLabel } from "@repo/ui/kit/Field";
import { Button } from "@repo/ui/kit/Button";
export type LocationValue = {
  countryId?: string;
  provinceId?: string;
  cityId?: string;
  districtId?: string;
};
export function LocationPicker({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (location: LocationValue) => void;
}) {
  const {
    countryId: country = "",
    provinceId: province = "",
    cityId: city = "",
    districtId: district = "",
  } = value;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <LocationSelect
        kind="countries"
        value={country}
        onChange={(id) => {
          onChange({ countryId: id || undefined });
        }}
      />
      <LocationSelect
        kind="provinces"
        parentId={country}
        value={province}
        onChange={(id) => {
          onChange({ countryId: country, provinceId: id || undefined });
        }}
      />
      <LocationSelect
        kind="cities"
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
}: {
  kind: GeographyKind;
  parentId?: string;
  value: string;
  onChange: (id: string) => void;
}) {
  const query = useLocations(kind, parentId);
  const t = useTranslations("Catalog");
  return (
    <Field>
      <FieldLabel htmlFor={`discovery-${kind}`}>{t(kind)}</FieldLabel>
      <NativeSelect
        id={`discovery-${kind}`}
        value={value}
        disabled={kind !== "countries" && !parentId}
        onChange={(event) => onChange(event.target.value)}
      >
        <NativeSelectOption value="">{t("allLocations")}</NativeSelectOption>
        {(query.data ?? []).map((place) => (
          <NativeSelectOption key={place.id} value={place.id}>
            {place.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {query.isError && (
        <Button variant="ghost" onClick={() => void query.refetch()}>
          {t("retry")}
        </Button>
      )}
    </Field>
  );
}
