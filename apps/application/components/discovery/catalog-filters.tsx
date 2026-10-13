"use client";
import { useTranslations } from "@repo/i18n";
import { validCatalogPrices, type ClubFiltersDto } from "@repo/api/catalog";
import { Field, FieldLabel } from "@repo/ui/kit/Field";
import { NativeSelect, NativeSelectOption } from "@repo/ui/kit/NativeSelect";
import { Input } from "@repo/ui/kit/Input";
export type PriceFilters = Pick<
  ClubFiltersDto,
  "serviceType" | "unit" | "minPrice" | "maxPrice" | "sort"
>;
export function CatalogFilters({
  value,
  onChange,
}: {
  value: PriceFilters;
  onChange: (value: PriceFilters) => void;
}) {
  const invalid = !validCatalogPrices(value);
  const t = useTranslations("Tariffs");
  const copy = useTranslations("Catalog");
  const services = [
    "visit",
    "membership",
    "court",
    "class",
    "coaching",
  ] as const;
  const units = [
    "visit",
    "hour",
    "session",
    "month",
    "package",
    "course",
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor="filter-service">{t("service")}</FieldLabel>
        <NativeSelect
          id="filter-service"
          value={value.serviceType ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              serviceType:
                (event.target.value as PriceFilters["serviceType"]) ||
                undefined,
            })
          }
        >
          <NativeSelectOption value="">
            {copy("allServices")}
          </NativeSelectOption>
          {services.map((service) => (
            <NativeSelectOption key={service} value={service}>
              {t(`service_${service}`)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field>
        <FieldLabel htmlFor="filter-unit">{t("unit")}</FieldLabel>
        <NativeSelect
          id="filter-unit"
          value={value.unit ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              unit: (event.target.value as PriceFilters["unit"]) || undefined,
            })
          }
        >
          <NativeSelectOption value="">{copy("allUnits")}</NativeSelectOption>
          {units.map((unit) => (
            <NativeSelectOption key={unit} value={unit}>
              {t(`unit_${unit}`)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field>
        <FieldLabel htmlFor="filter-min-price">{copy("minPrice")}</FieldLabel>
        <Input
          id="filter-min-price"
          aria-invalid={invalid}
          aria-describedby={invalid ? "filter-price-error" : undefined}
          type="number"
          min={0}
          max={1000000000}
          step={1}
          value={value.minPrice ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              minPrice:
                event.target.value === ""
                  ? undefined
                  : Number(event.target.value),
            })
          }
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="filter-max-price">{copy("maxPrice")}</FieldLabel>
        <Input
          id="filter-max-price"
          aria-invalid={invalid}
          aria-describedby={invalid ? "filter-price-error" : undefined}
          type="number"
          min={0}
          max={1000000000}
          step={1}
          value={value.maxPrice ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              maxPrice:
                event.target.value === ""
                  ? undefined
                  : Number(event.target.value),
            })
          }
        />
      </Field>
      {invalid && (
        <p
          id="filter-price-error"
          role="alert"
          className="text-sm text-destructive sm:col-span-2"
        >
          {copy("invalidPriceRange")}
        </p>
      )}
      <Field>
        <FieldLabel htmlFor="filter-sort">{copy("sort")}</FieldLabel>
        <NativeSelect
          id="filter-sort"
          value={value.sort ?? "recent"}
          onChange={(event) =>
            onChange({
              ...value,
              sort: event.target.value as PriceFilters["sort"],
            })
          }
        >
          {(["recent", "priceLow", "priceHigh"] as const).map((sort) => (
            <NativeSelectOption key={sort} value={sort}>
              {copy(sort)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
    </div>
  );
}
