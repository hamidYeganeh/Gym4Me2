"use client";
import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "@repo/i18n";
import { useGrowthQuery } from "@repo/api/growth";
import { useAdvancedOptions } from "@repo/api/advanced-business";
import type { ClubSummaryDto } from "@repo/api/catalog";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { Field } from "../advanced-business/forms";
import { Loading, QueryError } from "../account/common";
import { GrowthForm } from "./form";
type Accounts = {
  accounts: {
    network_id: string;
    balance_minor: string;
    name: string;
    terms: string;
    organization_ids: string[];
  }[];
  entries: {
    id: string;
    kind: string;
    delta_minor: string;
    created_at: string;
  }[];
};
type Networks = {
  networks: {
    id: string;
    name: string;
    terms: string;
    issuer_organization_id: string;
    status: string;
  }[];
  members: {
    network_id: string;
    organization_id: string;
    name: string;
    status: string;
  }[];
  balances: {
    network_id: string;
    earned_minor: string;
    settled_minor: string;
  }[];
};
const value = (f: FormData, k: string) => String(f.get(k) ?? "");
function useMoney() {
  const locale = useLocale();
  return (v: string) => new Intl.NumberFormat(locale).format(Number(v) / 10);
}
export function CreditPayment({
  orderId,
  organizationId,
  amount,
}: {
  orderId: string;
  organizationId: string;
  amount: string;
}) {
  const t = useTranslations("Growth"),
    q = useGrowthQuery<Accounts>("profile/credits"),
    money = useMoney();
  const accounts =
    q.data?.accounts.filter(
      (a) =>
        a.organization_ids.includes(organizationId) &&
        BigInt(a.balance_minor) >= BigInt(amount),
    ) ?? [];
  if (!accounts.length) return null;
  return (
    <section className="grid gap-4 rounded-2xl border p-4">
      <h2 className="font-semibold">{t("payCredit")}</h2>
      <GrowthForm
        path="profile/credits/pay"
        label={t("payCredit")}
        build={(f) => ({ networkId: value(f, "networkId"), orderId })}
      >
        <Field name="networkId" label={t("network")}>
          <NativeSelect name="networkId" required>
            {accounts.map((a) => (
              <NativeSelectOption key={a.network_id} value={a.network_id}>
                {a.name} · {money(a.balance_minor)} {t("toman")}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <p>{t("creditFullPayment")}</p>
      </GrowthForm>
    </section>
  );
}
export function AccountCredits() {
  const t = useTranslations("Growth"),
    q = useGrowthQuery<Accounts>("profile/credits"),
    money = useMoney();
  return (
    <main className="mx-auto grid min-h-dvh max-w-3xl gap-5 px-4 pt-7 pb-[calc(8rem+var(--app-safe-bottom,0px))]">
      <header className="flex justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("credits")}</h1>
        <Link href="/profile/settings">{t("back")}</Link>
      </header>
      {q.error ? (
        <QueryError error={q.error} retry={() => void q.refetch()} />
      ) : q.isLoading ? (
        <Loading />
      ) : (
        <>
          {!q.data?.accounts.length && <p>{t("noCredits")}</p>}
          {q.data?.accounts.map((a) => (
            <article
              className="grid gap-2 rounded-2xl border p-4"
              key={a.network_id}
            >
              <h2 className="font-semibold">{a.name}</h2>
              <p>
                {money(a.balance_minor)} {t("toman")}
              </p>
              <p>{a.terms}</p>
            </article>
          ))}
          <h2>{t("creditHistory")}</h2>
          {q.data?.entries.map((e) => (
            <p key={e.id}>
              {t(e.kind as "grant" | "spend" | "refund")} ·{" "}
              <bdi>
                {money(e.delta_minor)} {t("toman")}
              </bdi>
            </p>
          ))}
        </>
      )}
    </main>
  );
}
export function NetworkCreditPanel() {
  const t = useTranslations("Growth"),
    money = useMoney(),
    options = useAdvancedOptions("business"),
    [org, setOrg] = useState("");
  const organizations =
    options.data?.organizations.filter(
      (o) => o.role === "owner" || (o.role === "accountant" && o.all_branches),
    ) ?? [];
  const organization =
    organizations.find((o) => o.id === org) ?? organizations[0];
  const selected = organization?.id ?? "";
  const isOwner = organization?.role === "owner";
  const memberLabel = (status: string) =>
    t(
      status === "accepted"
        ? "networkActive"
        : status === "invited"
          ? "networkInvited"
          : "networkRemoved",
    );
  const q = useGrowthQuery<Networks>(
      "business/credit-networks",
      { organizationId: selected },
      !!selected,
    ),
    catalog = useGrowthQuery<ClubSummaryDto[]>("catalog/clubs");
  return (
    <main className="mx-auto grid min-h-dvh max-w-4xl gap-6 px-4 pt-7 pb-[calc(8rem+var(--app-safe-bottom,0px))]">
      <h1 className="text-2xl font-semibold">{t("networks")}</h1>
      <Field name="organization" label={t("organization")}>
        <NativeSelect value={selected} onChange={(e) => setOrg(e.target.value)}>
          {organizations.map((o) => (
            <NativeSelectOption key={o.id} value={o.id}>
              {o.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      {options.isLoading ? (
        <Loading />
      ) : options.error ? (
        <QueryError
          error={options.error}
          retry={() => void options.refetch()}
        />
      ) : q.error ? (
        <QueryError error={q.error} retry={() => void q.refetch()} />
      ) : !selected ? (
        <p>{t("noScope")}</p>
      ) : q.isLoading ? (
        <Loading />
      ) : (
        <>
          {isOwner && (
            <section className="grid gap-4 rounded-2xl border p-4">
              <h2 className="text-xl font-semibold">{t("createNetwork")}</h2>
              <GrowthForm
                key={selected}
                path="business/credit-networks"
                label={t("save")}
                build={(f) => ({
                  organizationId: selected,
                  name: value(f, "name"),
                  terms: value(f, "terms"),
                })}
              >
                <Field name="name" label={t("name")} />
                <Field name="terms" label={t("networkTerms")} />
              </GrowthForm>
            </section>
          )}
          {q.data?.networks.map((n) => (
            <article key={n.id} className="grid gap-5 rounded-2xl border p-4">
              <h2 className="text-xl font-semibold">{n.name}</h2>
              <p>{n.terms}</p>
              {n.status === "invited" && isOwner ? (
                <GrowthForm
                  path={`business/credit-networks/${n.id}/members`}
                  label={t("acceptNetwork")}
                  build={() => ({ organizationId: selected, action: "accept" })}
                >
                  <label className="flex min-h-11 gap-3">
                    <input type="checkbox" required />
                    {t("acceptNetworkTerms")}
                  </label>
                </GrowthForm>
              ) : (
                <p>{memberLabel(n.status)}</p>
              )}
              {q.data?.balances
                .filter((b) => b.network_id === n.id)
                .map((b) => (
                  <p key={b.network_id}>
                    {t("earned")}: {money(b.earned_minor)} · {t("settled")}:{" "}
                    {money(b.settled_minor)} {t("toman")}
                  </p>
                ))}
              {n.issuer_organization_id === selected && (
                <>
                  {isOwner && (
                    <GrowthForm
                      path={`business/credit-networks/${n.id}/members`}
                      label={t("inviteOrganization")}
                      build={(f) => ({
                        organizationId: value(f, "organizationId"),
                        action: "invite",
                      })}
                    >
                      {catalog.error && (
                        <QueryError
                          error={catalog.error}
                          retry={() => void catalog.refetch()}
                        />
                      )}
                      <Field name="organizationId" label={t("organization")}>
                        <NativeSelect name="organizationId" required>
                          <NativeSelectOption value="">
                            {t("choose")}
                          </NativeSelectOption>
                          {catalog.data
                            ?.filter((o) => o.id !== selected)
                            .map((o) => (
                              <NativeSelectOption value={o.id} key={o.id}>
                                {o.name}
                              </NativeSelectOption>
                            ))}
                        </NativeSelect>
                      </Field>
                    </GrowthForm>
                  )}
                  <GrowthForm
                    path={`business/credit-networks/${n.id}/grants`}
                    label={t("grantCredit")}
                    build={(f) => ({
                      phone: value(f, "phone"),
                      amountMinor: (
                        BigInt(value(f, "amount")) * BigInt(10)
                      ).toString(),
                      receipt: value(f, "receipt"),
                      reason: value(f, "reason"),
                    })}
                  >
                    <p>{t("manualReceiptHint")}</p>
                    <Field name="phone" type="tel" label={t("phone")} />
                    <Field
                      name="amount"
                      type="number"
                      min="1"
                      label={t("amountToman")}
                    />
                    <Field name="receipt" label={t("receipt")} />
                    <Field name="reason" label={t("reason")} />
                  </GrowthForm>
                  <GrowthForm
                    path={`business/credit-networks/${n.id}/settlements`}
                    label={t("recordSettlement")}
                    build={(f) => ({
                      organizationId: value(f, "organizationId"),
                      amountMinor: (
                        BigInt(value(f, "amount")) * BigInt(10)
                      ).toString(),
                      reference: value(f, "reference"),
                      reason: value(f, "reason"),
                    })}
                  >
                    <p>{t("manualSettlementHint")}</p>
                    <Field name="organizationId" label={t("organization")}>
                      <NativeSelect name="organizationId" required>
                        {q.data?.members
                          .filter((m) => m.network_id === n.id)
                          .map((m) => (
                            <NativeSelectOption
                              key={m.organization_id}
                              value={m.organization_id}
                            >
                              {m.name}
                            </NativeSelectOption>
                          ))}
                      </NativeSelect>
                    </Field>
                    <Field
                      name="amount"
                      type="number"
                      min="1"
                      label={t("amountToman")}
                    />
                    <Field name="reference" label={t("receipt")} />
                    <Field name="reason" label={t("reason")} />
                  </GrowthForm>
                  <ul>
                    {q.data?.members
                      .filter((m) => m.network_id === n.id)
                      .map((m) => (
                        <li
                          key={m.organization_id}
                          className="grid gap-2 border-t py-3"
                        >
                          <p>
                            {m.name} · {memberLabel(m.status)}
                          </p>
                          {isOwner &&
                            m.organization_id !== selected &&
                            m.status !== "removed" && (
                              <GrowthForm
                                path={`business/credit-networks/${n.id}/members`}
                                label={t("removeOrganization")}
                                build={() => ({
                                  organizationId: m.organization_id,
                                  action: "remove",
                                })}
                              >
                                <p>{t("preserveOrders")}</p>
                              </GrowthForm>
                            )}
                        </li>
                      ))}
                  </ul>
                </>
              )}
            </article>
          ))}
        </>
      )}
    </main>
  );
}
