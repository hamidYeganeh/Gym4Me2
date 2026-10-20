import type {
  ClubDto,
  TariffDto,
  TariffService,
  TariffUnit,
} from "@repo/api/catalog";

function announcedText(value: string) {
  return value
    .normalize("NFC")
    .replace(/[\u064a\u0649]/g, String.fromCharCode(0x6cc))
    .replace(/\u0643/g, String.fromCharCode(0x6a9))
    .replace(/[\u06f0-\u06f9]/g, (digit) => String(digit.charCodeAt(0) - 0x6f0))
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x660))
    .replace(/[\s\u200c]+/g, " ")
    .trim();
}

/** Price/name/version do not define equivalent announced entitlements. */
export function tariffDefinition(tariff: TariffDto) {
  return JSON.stringify([
    tariff.serviceType,
    tariff.unit,
    tariff.currency,
    tariff.durationDays ?? null,
    tariff.sessionCount ?? null,
    [...new Set((tariff.includedServices ?? []).map(announcedText))].sort(),
    announcedText(tariff.conditions),
    tariff.branchId === null ? "all-branches" : "one-branch",
  ]);
}

export function tariffComparisonRows(
  clubs: Pick<ClubDto, "id" | "tariffs">[],
  service: TariffService,
  unit: TariffUnit,
) {
  const rows = new Map<
    string,
    { key: string; terms: TariffDto; offers: Map<string, TariffDto[]> }
  >();
  for (const club of clubs) {
    for (const tariff of club.tariffs) {
      if (
        !tariff.isActive ||
        tariff.serviceType !== service ||
        tariff.unit !== unit
      )
        continue;
      const key = tariffDefinition(tariff);
      let row = rows.get(key);
      if (!row) {
        row = { key, terms: tariff, offers: new Map() };
        rows.set(key, row);
      }
      row.offers.set(club.id, [...(row.offers.get(club.id) ?? []), tariff]);
    }
  }
  for (const row of rows.values())
    for (const offers of row.offers.values())
      offers.sort(
        (a, b) =>
          a.priceToman - b.priceToman || a.versionId.localeCompare(b.versionId),
      );
  return [...rows.values()];
}
