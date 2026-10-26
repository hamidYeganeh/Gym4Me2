"use client";
import { SuccessNotice } from "../account/common";
import {
  normalizeLoginDigits,
  normalizeLoginPhone,
} from "../account/login-validation";
import { IranianDateInput } from "../kit/IranianDateInput";
import { useDeferredValue, useRef, useState } from "react";
import { useTranslations } from "@repo/i18n";
import {
  useSportsQuery,
  useSportsCommand,
  type ServiceDto,
} from "@repo/api/sports";
import { Button } from "../kit/Button";
import { Input } from "../kit/Input";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { FormField } from "./shared";
import { QueryError } from "./query-error";
import { ReceiptForm } from "./payment-receipts";
export function CustomerEntry({
  org,
  branch,
}: {
  org: string;
  branch: string;
}) {
  const t = useTranslations("Workflow"),
    [search, setSearch] = useState("");
  const deferred = useDeferredValue(search);
  const query = useSportsQuery<
    {
      id: string;
      displayName: string;
      phone: string;
      memberships: {
        id: string;
        dependentName?: string | null;
        title: string;
        status: string;
        entryAllowed: boolean;
        startsAt: string;
        endsAt: string | null;
      }[];
    }[]
  >(
    "business/sports-workflows/customers",
    {
      organizationId: org,
      branchId: branch,
      search: /^\+?[0-9۰-۹٠-٩\s()-]+$/.test(deferred)
        ? normalizeLoginPhone(deferred)
        : deferred,
    },
    deferred.length >= 3,
  );
  const entry = useSportsCommand("business/sports-workflows/entry");
  return (
    <section className="rounded-2xl border p-4 grid gap-3">
      <FormField label={t("customerSearch")}>
        <Input
          type="search"
          value={search}
          maxLength={100}
          onChange={(e) => setSearch(normalizeLoginDigits(e.target.value))}
        />
      </FormField>
      <p className="text-sm text-muted-foreground">{t("searchHint")}</p>
      {deferred.length >= 3 && (
        <QueryError error={query.error} retry={query.refetch} />
      )}
      <QueryError error={entry.error} />
      <SuccessNotice success={entry.isSuccess} message={t("entryRecorded")} />
      {query.data?.map((c) => (
        <article className="rounded-xl border p-3 grid gap-2" key={c.id}>
          <p>
            {c.displayName} · <span dir="ltr">{c.phone}</span>
          </p>
          {c.memberships.map((m) => (
            <div
              className="flex flex-wrap items-center justify-between gap-3"
              key={m.id}
            >
              <span>
                {m.dependentName ? `${m.dependentName} · ` : ""}
                {m.title}
              </span>
              <Button
                disabled={
                  entry.isPending ||
                  m.status !== "active" ||
                  !m.entryAllowed ||
                  Date.parse(m.startsAt) > Date.now() ||
                  Boolean(m.endsAt && Date.parse(m.endsAt) <= Date.now())
                }
                onClick={() =>
                  entry.mutate({
                    organizationId: org,
                    branchId: branch,
                    membershipId: m.id,
                    idempotencyKey: crypto.randomUUID(),
                  })
                }
              >
                {t("recordEntry")}
              </Button>
            </div>
          ))}
        </article>
      ))}
    </section>
  );
}
export function ReceptionSale({
  org,
  branch,
}: {
  org: string;
  branch: string;
}) {
  const t = useTranslations("Workflow"),
    [serviceId, setServiceId] = useState(""),
    [phone, setPhone] = useState(""),
    [quantity, setQuantity] = useState(1),
    [order, setOrder] = useState<string | null>(null);
  const key = useRef(crypto.randomUUID());
  const services = useSportsQuery<ServiceDto[]>("business/sports/services", {
    organizationId: org,
    branchId: branch,
  });
  const detail = useSportsQuery<ServiceDto>(
    `sports/services/${serviceId}`,
    undefined,
    Boolean(serviceId),
  );
  const command = useSportsCommand<{ id: string }>(
    "business/sports-workflows/sales",
  );
  const selected = detail.data;
  const normalizedPhone = normalizeLoginPhone(phone);
  const deferredPhone = useDeferredValue(normalizedPhone);
  const customers = useSportsQuery<
    {
      phone: string;
      memberships: {
        id: string;
        serviceId: string;
        title: string;
        status: string;
        endsAt: string | null;
      }[];
    }[]
  >(
    "business/sports-workflows/customers",
    {
      organizationId: org,
      branchId: branch,
      search: deferredPhone,
    },
    selected?.kind === "membership" && /^\+989\d{9}$/.test(deferredPhone),
  );
  const renewals =
    customers.data
      ?.find((c) => c.phone === normalizedPhone)
      ?.memberships.filter(
        (m) =>
          m.serviceId === serviceId &&
          ["active", "expired", "frozen"].includes(m.status),
      ) ?? [];
  return (
    <details className="rounded-2xl border p-4">
      <summary className="font-semibold cursor-pointer">{t("sale")}</summary>
      <form
        className="grid gap-4 mt-4 sm:grid-cols-2"
        onChange={() => {
          key.current = crypto.randomUUID();
        }}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          command.mutate(
            {
              customer: {
                phone: normalizeLoginPhone(String(f.get("phone"))),
                name: f.get("name"),
              },
              purchase: {
                serviceId,
                occurrenceId: f.get("occurrence") || undefined,
                renewMembershipId: f.get("renewMembershipId") || undefined,
                quantity,
                participants: Array.from({ length: quantity }, (_, i) => ({
                  name: f.get(`participant-${i}`) || f.get("name"),
                  birthDate: f.get(`birth-${i}`) || null,
                  gender: f.get(`gender-${i}`) || "unspecified",
                })),
                idempotencyKey: key.current,
              },
            },
            { onSuccess: (r) => setOrder(r.id) },
          );
        }}
      >
        <FormField label={t("name")}>
          <Input name="name" minLength={2} maxLength={120} required />
        </FormField>
        <FormField label={t("phone")}>
          <Input
            name="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(normalizeLoginPhone(e.target.value))}
            pattern="(09[0-9]{9}|\+989[0-9]{9})"
            required
          />
        </FormField>
        <FormField label={t("service")}>
          <NativeSelect
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              setQuantity(1);
              setOrder(null);
            }}
            required
          >
            <NativeSelectOption value="">{t("service")}</NativeSelectOption>
            {services.data
              ?.filter((s) => s.status === "published")
              .map((s) => (
                <NativeSelectOption key={s.id} value={s.id}>
                  {s.sportName} · {s.title}
                </NativeSelectOption>
              ))}
          </NativeSelect>
        </FormField>
        {selected && !["membership", "program"].includes(selected.kind) && (
          <FormField label={t("occurrence")}>
            <NativeSelect name="occurrence" required>
              <NativeSelectOption value="">
                {t("occurrence")}
              </NativeSelectOption>
              {selected.occurrences
                .filter(
                  (o) =>
                    o.remaining >= quantity && o.resourceAvailable !== false,
                )
                .map((o) => (
                  <NativeSelectOption key={o.id} value={o.id}>
                    {new Date(o.startAt).toLocaleString("fa-IR")}
                  </NativeSelectOption>
                ))}
            </NativeSelect>
          </FormField>
        )}
        {selected?.kind === "membership" && (
          <FormField label={t("renew")}>
            <NativeSelect
              name="renewMembershipId"
              key={`${normalizedPhone}:${serviceId}`}
            >
              <NativeSelectOption value="">
                {t("newMembership")}
              </NativeSelectOption>
              {renewals.map((m) => (
                <NativeSelectOption key={m.id} value={m.id}>
                  {m.title}
                  {m.endsAt
                    ? ` · ${new Date(m.endsAt).toLocaleDateString("fa-IR")}`
                    : ""}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <QueryError error={customers.error} />
          </FormField>
        )}
        {selected?.kind === "access" && (
          <FormField label={t("quantity")}>
            <Input
              value={quantity}
              type="number"
              min={1}
              max={selected.offering?.maxTickets ?? 20}
              onChange={(e) =>
                setQuantity(
                  Math.min(
                    selected.offering?.maxTickets ?? 20,
                    Math.max(1, Number(e.target.value) || 1),
                  ),
                )
              }
            />
          </FormField>
        )}
        {Array.from({ length: quantity }, (_, i) => (
          <fieldset key={i} className="grid gap-3 rounded-xl border p-3">
            <legend>{t("participant", { number: i + 1 })}</legend>
            <FormField label={t("name")}>
              <Input
                name={`participant-${i}`}
                minLength={2}
                maxLength={120}
                required={quantity > 1}
              />
            </FormField>
            <FormField label={t("birthDate")}>
              <IranianDateInput
                name={`birth-${i}`}
                required={
                  selected?.eligibility.minimumAge != null ||
                  selected?.eligibility.maximumAge != null
                }
              />
            </FormField>
            <FormField label={t("gender")}>
              <NativeSelect name={`gender-${i}`} required>
                <NativeSelectOption value="unspecified">
                  {t("unspecified")}
                </NativeSelectOption>
                <NativeSelectOption value="male">
                  {t("male")}
                </NativeSelectOption>
                <NativeSelectOption value="female">
                  {t("female")}
                </NativeSelectOption>
              </NativeSelect>
            </FormField>
          </fieldset>
        ))}
        <Button type="submit" disabled={!selected || command.isPending}>
          {t("sale")}
        </Button>
        <QueryError error={command.error ?? detail.error ?? services.error} />
      </form>
      {order && (
        <>
          <SuccessNotice success={!!order} message={t("orderRecorded")} />
          <ReceiptForm key={order} orderId={order} business />
        </>
      )}
    </details>
  );
}
