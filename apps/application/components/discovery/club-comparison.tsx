"use client";
import { MobileHeader } from "@repo/ui/mobile-page";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "@repo/i18n";
import {
  useCompareClubs,
  type TariffService,
  type TariffUnit,
} from "@repo/api/catalog";
import { useCatalogClubs } from "./use-catalog";
import { clubHref } from "../../lib/club-href";
import { CatalogState } from "./catalog-state";
import { CatalogPagination } from "./catalog-pagination";
import { Button } from "@repo/ui/kit/Button";
import { Input } from "@repo/ui/kit/Input";
import { Field, FieldLabel } from "@repo/ui/kit/Field";
import { NativeSelect, NativeSelectOption } from "@repo/ui/kit/NativeSelect";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@repo/ui/kit/Table";
export function ClubComparison() {
  const empty = useTranslations("Discovery");
  const params = useSearchParams();
  const t = useTranslations("Comparison");
  const labels = useTranslations("Tariffs");
  const locale = useLocale();
  const initial = params.get("club");
  const [selected, setSelected] = useState<string[]>(
    initial && /^[0-9a-f-]{36}$/i.test(initial) ? [initial] : [],
  );
  const [names, setNames] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [service, setService] = useState<TariffService>("visit");
  const [unit, setUnit] = useState<TariffUnit>("visit");
  const clubs = useCatalogClubs({ search, page });
  const comparison = useCompareClubs(selected);
  const number = new Intl.NumberFormat(locale);
  const options = [
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
    <main className="flex min-h-dvh flex-col gap-6 px-5 pt-[calc(1.5rem+var(--app-safe-top))] pb-[calc(1.5rem+var(--app-safe-bottom))]">
      <MobileHeader title={t("title")} />
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
      <div className="flex flex-wrap gap-2">
        {selected.map((id) => (
          <Button
            key={id}
            variant="secondary"
            onClick={() => setSelected(selected.filter((item) => item !== id))}
          >
            {names[id] ??
              comparison.data?.find((club) => club.id === id)?.name ??
              t("selected")}{" "}
            · {t("remove")}
          </Button>
        ))}
      </div>
      <Field>
        <FieldLabel htmlFor="compare-search">{t("search")}</FieldLabel>
        <Input
          id="compare-search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </Field>
      {clubs.isPending ? (
        <CatalogState loading />
      ) : clubs.isError ? (
        <CatalogState retry={() => void clubs.refetch()} />
      ) : (
        <div className="grid gap-2">
          {clubs.clubs.map((club) => (
            <label
              key={club.id}
              className="flex items-center gap-3 rounded-xl border p-3 text-sm"
            >
              <input
                type="checkbox"
                className="accent-primary"
                checked={selected.includes(club.id)}
                disabled={selected.length === 3 && !selected.includes(club.id)}
                onChange={(event) => {
                  setNames({ ...names, [club.id]: club.name });
                  setSelected(
                    event.target.checked
                      ? [...selected, club.id]
                      : selected.filter((id) => id !== club.id),
                  );
                }}
              />
              {club.name}
              <span className="ms-auto text-xs text-muted-foreground">
                {club.cityName}
              </span>
            </label>
          ))}
        </div>
      )}
      {!clubs.isPending && !clubs.isError && clubs.clubs.length === 0 && (
        <p role="status" className="text-sm text-muted-foreground">
          {empty("noClubs")}
        </p>
      )}
      <CatalogPagination
        page={page}
        onChange={setPage}
        next={(clubs.data?.length ?? 0) === 25}
        busy={clubs.isFetching}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="compare-service">{labels("service")}</FieldLabel>
          <NativeSelect
            id="compare-service"
            value={service}
            onChange={(event) =>
              setService(event.target.value as TariffService)
            }
          >
            {options.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {labels(`service_${value}`)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="compare-unit">{labels("unit")}</FieldLabel>
          <NativeSelect
            id="compare-unit"
            value={unit}
            onChange={(event) => setUnit(event.target.value as TariffUnit)}
          >
            {units.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {labels(`unit_${value}`)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>
      {selected.length < 2 ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t("chooseTwo")}
        </p>
      ) : comparison.isPending ? (
        <CatalogState loading />
      ) : comparison.isError ? (
        <CatalogState retry={() => void comparison.refetch()} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("criterion")}</TableHead>
              {comparison.data?.map((club) => (
                <TableHead key={club.id}>
                  <Link className="underline" href={clubHref(club.id)}>
                    {club.name}
                  </Link>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>{labels("price")}</TableCell>
              {comparison.data?.map((club) => {
                const offer = club.tariffs
                  .filter(
                    (tariff) =>
                      tariff.serviceType === service && tariff.unit === unit,
                  )
                  .sort((a, b) => a.priceToman - b.priceToman)[0];
                return (
                  <TableCell key={club.id}>
                    {offer
                      ? `${number.format(offer.priceToman)} ${labels("toman")} / ${labels(`unit_${offer.unit}`)}`
                      : t("noComparableOffer")}
                  </TableCell>
                );
              })}
            </TableRow>
            <TableRow>
              <TableCell>{t("categories")}</TableCell>
              {comparison.data?.map((club) => (
                <TableCell key={club.id}>
                  {club.categories.map((category) => category.name).join(" · ")}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell>{t("sports")}</TableCell>
              {comparison.data?.map((club) => (
                <TableCell key={club.id}>
                  {club.sports.map((sport) => sport.name).join(" · ")}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell>{t("rating")}</TableCell>
              {comparison.data?.map((club) => (
                <TableCell key={club.id}>
                  {club.rating.average === null
                    ? t("noRating")
                    : `${number.format(club.rating.average)} (${number.format(club.rating.count)})`}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell>{labels("conditions")}</TableCell>
              {comparison.data?.map((club) => (
                <TableCell key={club.id}>
                  <div className="grid min-w-44 gap-4">
                    {club.tariffs
                      .filter(
                        (tariff) =>
                          tariff.serviceType === service &&
                          tariff.unit === unit,
                      )
                      .map((tariff) => (
                        <div key={tariff.versionId}>
                          <p className="font-medium">
                            {tariff.name} · {number.format(tariff.priceToman)}{" "}
                            {labels("toman")}
                          </p>
                          <p className="whitespace-pre-line">
                            {tariff.conditions}
                          </p>
                          {tariff.durationDays && (
                            <p>
                              {labels("validDays", {
                                count: tariff.durationDays,
                              })}
                            </p>
                          )}
                          {tariff.sessionCount && (
                            <p>
                              {labels("sessionAllowance", {
                                count: tariff.sessionCount,
                              })}
                            </p>
                          )}
                          <ul className="list-inside list-disc">
                            {tariff.includedServices?.map((item, index) => (
                              <li key={index}>{item}</li>
                            ))}
                          </ul>
                          <p className="text-xs text-muted-foreground">
                            {club.branches.find(
                              (branch) => branch.id === tariff.branchId,
                            )?.name ?? labels("allBranches")}{" "}
                            ·{" "}
                            {labels("version", {
                              version: number.format(tariff.version),
                            })}
                          </p>
                        </div>
                      ))}
                  </div>
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      )}
    </main>
  );
}
