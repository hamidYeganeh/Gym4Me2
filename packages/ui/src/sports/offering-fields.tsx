"use client";
import { useTranslations } from "@repo/i18n";
import {
  useSportsQuery,
  type ServiceDto,
  type OfferingDto,
} from "@repo/api/sports";
import { FormField } from "./shared";
import { Input } from "../kit/Input";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { QueryError } from "./query-error";
export function readOffering(f: FormData): OfferingDto {
  return {
    includedServiceIds: f.getAll("includedServices").map(String),
    entryAllowed: f.has("entryAllowed"),
    entryLimitPerDay: f.get("entryLimit") ? Number(f.get("entryLimit")) : null,
    audience: String(f.get("audience") ?? "all") as OfferingDto["audience"],
    maxTickets: Number(f.get("maxTickets") ?? 20),
    deliveryDays: Number(f.get("deliveryDays") ?? 3),
    supportDays: Number(f.get("supportDays") ?? 30),
    maxRevisions: f.get("maxRevisions") ? Number(f.get("maxRevisions")) : null,
    responseHours: f.get("responseHours")
      ? Number(f.get("responseHours"))
      : null,
    confirmation: String(
      f.get("confirmation") ?? "instant",
    ) as OfferingDto["confirmation"],
  };
}
export function OfferingFields({
  kind,
  service,
  services = [],
}: {
  kind: ServiceDto["kind"];
  service?: ServiceDto;
  services?: ServiceDto[];
}) {
  const t = useTranslations("Workflow");
  const sports =
    useSportsQuery<{ id: string; name: string }[]>("sports/formats");
  return (
    <>
      <FormField label={t("sport")}>
        <NativeSelect
          name="sportId"
          defaultValue={service?.sportId ?? ""}
          required
        >
          <NativeSelectOption value="">{t("chooseSport")}</NativeSelectOption>
          {sports.data?.map((s) => (
            <NativeSelectOption key={s.id} value={s.id}>
              {s.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <QueryError error={sports.error} retry={sports.refetch} />
      </FormField>
      <FormField label={t("audience")}>
        <NativeSelect
          name="audience"
          defaultValue={service?.offering?.audience ?? "all"}
        >
          {(["all", "men", "women", "family"] as const).map((a) => (
            <NativeSelectOption key={a} value={a}>
              {t(a)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>
      {kind === "membership" && (
        <fieldset className="grid gap-3 sm:col-span-2">
          <legend>{t("benefits")}</legend>
          <p className="text-sm text-muted-foreground">{t("benefitsHint")}</p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="entryAllowed"
              defaultChecked={service?.offering?.entryAllowed ?? true}
            />
            {t("entryAllowed")}
          </label>
          <FormField label={t("entryLimit")}>
            <Input
              type="number"
              name="entryLimit"
              min={1}
              max={20}
              defaultValue={service?.offering?.entryLimitPerDay ?? ""}
            />
          </FormField>
          {services
            .filter(
              (s) =>
                !["membership", "program"].includes(s.kind) &&
                s.id !== service?.id,
            )
            .map((s) => (
              <label className="flex items-center gap-2" key={s.id}>
                <input
                  type="checkbox"
                  name="includedServices"
                  value={s.id}
                  defaultChecked={service?.offering?.includedServiceIds.includes(
                    s.id,
                  )}
                />
                {s.title}
              </label>
            ))}
        </fieldset>
      )}
      {kind === "access" && (
        <FormField label={t("maxTickets")}>
          <Input
            name="maxTickets"
            type="number"
            min={1}
            max={20}
            defaultValue={service?.offering?.maxTickets ?? 20}
            required
          />
        </FormField>
      )}
      {kind === "program" && (
        <>
          <FormField label={t("deliveryDays")}>
            <Input
              name="deliveryDays"
              type="number"
              min={1}
              max={90}
              defaultValue={service?.offering?.deliveryDays ?? 3}
              required
            />
          </FormField>
          <ProgramCommitmentFields offering={service?.offering} />
          <FormField label={t("supportDays")}>
            <Input
              name="supportDays"
              type="number"
              min={0}
              max={365}
              defaultValue={service?.offering?.supportDays ?? 30}
              required
            />
          </FormField>
        </>
      )}
      {!["membership", "program"].includes(kind) && (
        <FormField label={t("confirmation")}>
          <NativeSelect
            name="confirmation"
            defaultValue={service?.offering?.confirmation ?? "instant"}
          >
            <NativeSelectOption value="instant">
              {t("instant")}
            </NativeSelectOption>
            <NativeSelectOption value="before_payment">
              {t("before_payment")}
            </NativeSelectOption>
          </NativeSelect>
        </FormField>
      )}
    </>
  );
}

function ProgramCommitmentFields({ offering }: { offering?: OfferingDto }) {
  const t = useTranslations("ProgramCommitments");
  return (
    <>
      <FormField label={t("maxRevisions")}>
        <Input
          name="maxRevisions"
          type="number"
          min={0}
          max={100}
          defaultValue={offering?.maxRevisions ?? ""}
          required
        />
      </FormField>
      <FormField label={t("responseHours")}>
        <Input
          name="responseHours"
          type="number"
          min={1}
          max={720}
          defaultValue={offering?.responseHours ?? ""}
        />
      </FormField>
    </>
  );
}
