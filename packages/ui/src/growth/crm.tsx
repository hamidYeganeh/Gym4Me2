"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "@repo/i18n";
import {
  useGrowthQuery,
  type CrmData,
  type CrmBranch,
  type CrmLead,
  type CampaignPreview,
} from "@repo/api/growth";
import { Button } from "../kit/Button";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { Card, CardContent, CardHeader, CardTitle } from "../kit/Card";
import { Loading, QueryError } from "../account/common";
import { Field } from "../advanced-business/forms";
import { GrowthForm } from "./form";
import { OfferManager } from "./offers";
const stages = ["new", "contacted", "trial", "won", "lost"] as const;
const v = (f: FormData, k: string) => String(f.get(k) ?? "");
function stageOptions(
  t: (key: (typeof stages)[number] | "all") => string,
  all = false,
) {
  return [
    ...(all
      ? [
          <NativeSelectOption key="all" value="all">
            {t("all")}
          </NativeSelectOption>,
        ]
      : []),
    ...stages.map((stage) => (
      <NativeSelectOption key={stage} value={stage}>
        {t(stage)}
      </NativeSelectOption>
    )),
  ];
}
function LeadEditor({ lead }: { lead: CrmLead }) {
  const t = useTranslations("Growth");
  return (
    <details className="rounded-xl border p-4">
      <summary className="min-h-11 cursor-pointer">
        <strong>{lead.name}</strong> · {t(lead.stage)} <bdi>{lead.phone}</bdi>
      </summary>
      <GrowthForm
        path={`business/crm/leads/${lead.id}`}
        label={t("save")}
        build={(f) => ({
          revision: lead.revision,
          name: v(f, "name"),
          stage: v(f, "stage"),
          note: v(f, "note"),
          followUpAt: v(f, "followUpAt")
            ? new Date(v(f, "followUpAt")).toISOString()
            : null,
          archived: f.get("archived") === "on",
        })}
      >
        <Field name="name" label={t("name")} defaultValue={lead.name} />
        <Field name="stage" label={t("stage")}>
          <NativeSelect name="stage" defaultValue={lead.stage}>
            {stageOptions(t)}
          </NativeSelect>
        </Field>
        <Field
          name="note"
          label={t("note")}
          required={false}
          defaultValue={lead.note}
        />
        <Field
          name="followUpAt"
          type="datetime-local"
          label={t("followUp")}
          required={false}
          defaultValue={lead.follow_up_at ? localDate(lead.follow_up_at) : ""}
        />
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="archived" />
          {t("archive")}
        </label>
      </GrowthForm>
    </details>
  );
}
function localDate(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function CampaignSend({ id }: { id: string }) {
  const t = useTranslations("Growth"),
    q = useGrowthQuery<CampaignPreview>(`business/crm/campaigns/${id}/preview`);
  return (
    <div className="mt-4 grid gap-3">
      <p>{t("consentHint")}</p>
      {q.error ? (
        <QueryError error={q.error} retry={() => void q.refetch()} />
      ) : q.data ? (
        <>
          <p>{t("audience", { count: q.data.count })}</p>
          <GrowthForm
            path={`business/crm/campaigns/${id}/send`}
            label={t("confirmSend")}
            build={() => ({
              revision: q.data!.revision,
              audienceHash: q.data!.audienceHash,
            })}
          >
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" required />
              {t("confirmAudience")}
            </label>
          </GrowthForm>
        </>
      ) : (
        <Loading />
      )}
    </div>
  );
}
export function CrmPanel() {
  const t = useTranslations("Growth"),
    locale = useLocale(),
    options = useGrowthQuery<CrmBranch[]>("business/crm/options");
  const [branch, setBranch] = useState(""),
    [page, setPage] = useState(1);
  const selected =
    options.data?.find((b) => b.id === branch) ?? options.data?.[0];
  const q = useGrowthQuery<CrmData>(
    "business/crm",
    { organizationId: selected?.organization_id, branchId: selected?.id, page },
    !!selected,
  );
  return (
    <main className="mx-auto grid min-h-dvh max-w-5xl gap-6 px-4 pt-7 pb-[calc(8rem+var(--app-safe-bottom,0px))] sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("intro")}</p>
      </header>
      {options.isLoading ? (
        <Loading />
      ) : options.error ? (
        <QueryError
          error={options.error}
          retry={() => void options.refetch()}
        />
      ) : !selected ? (
        <p>{t("noScope")}</p>
      ) : (
        <>
          <Field name="branch" label={t("branch")}>
            <NativeSelect
              name="branch"
              value={selected.id}
              onChange={(e) => {
                setBranch(e.target.value);
                setPage(1);
              }}
            >
              {options.data?.map((b) => (
                <NativeSelectOption value={b.id} key={b.id}>
                  {b.organization_name} · {b.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          {selected.role !== "receptionist" && (
            <OfferManager
              key={selected.id}
              organizationId={selected.organization_id}
              branchId={selected.id}
            />
          )}
          {q.error ? (
            <QueryError error={q.error} retry={() => void q.refetch()} />
          ) : q.isLoading ? (
            <Loading />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {stages.map((s) => {
                  const n = q.data?.funnel.find((f) => f.stage === s);
                  return (
                    <Card key={s}>
                      <CardContent className="p-4">
                        <p>{t(s)}</p>
                        <p className="text-2xl font-semibold">
                          {new Intl.NumberFormat(locale).format(n?.count ?? 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("overdue", { count: n?.overdue ?? 0 })}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{t("newLead")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <GrowthForm
                    key={selected.id}
                    path="business/crm/leads"
                    label={t("save")}
                    build={(f) => ({
                      organizationId: selected.organization_id,
                      branchId: selected.id,
                      name: v(f, "name"),
                      phone: v(f, "phone"),
                      stage: v(f, "stage"),
                      note: v(f, "note"),
                      followUpAt: v(f, "followUpAt")
                        ? new Date(v(f, "followUpAt")).toISOString()
                        : null,
                    })}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field name="name" label={t("name")} />
                      <Field name="phone" type="tel" label={t("phone")} />
                      <Field name="stage" label={t("stage")}>
                        <NativeSelect name="stage" defaultValue="new">
                          {stageOptions(t)}
                        </NativeSelect>
                      </Field>
                      <Field
                        name="followUpAt"
                        type="datetime-local"
                        label={t("followUp")}
                        required={false}
                      />
                    </div>
                    <Field name="note" label={t("note")} required={false} />
                  </GrowthForm>
                </CardContent>
              </Card>
              <section aria-label={t("leads")} className="grid gap-3">
                {q.data?.leads.length ? (
                  q.data.leads.map((l) => (
                    <LeadEditor lead={l} key={`${l.id}:${l.revision}`} />
                  ))
                ) : (
                  <p>{t("empty")}</p>
                )}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    {t("previous")}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!q.data?.hasMore}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    {t("next")}
                  </Button>
                </div>
              </section>
              <Card>
                <CardHeader>
                  <CardTitle>{t("newCampaign")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <GrowthForm
                    path="business/crm/campaigns"
                    label={t("save")}
                    build={(f) => ({
                      organizationId: selected.organization_id,
                      branchId: selected.id,
                      title: v(f, "title"),
                      body: v(f, "body"),
                      stage: v(f, "stage"),
                    })}
                  >
                    <Field name="title" label={t("campaignTitle")} />
                    <Field name="body" label={t("body")} />
                    <Field name="stage" label={t("stage")}>
                      <NativeSelect name="stage" defaultValue="all">
                        {stageOptions(t, true)}
                      </NativeSelect>
                    </Field>
                  </GrowthForm>
                </CardContent>
              </Card>
              <section className="grid gap-3" aria-label={t("campaigns")}>
                {q.data?.campaigns.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="p-4">
                      <h2 className="font-semibold">{c.title}</h2>
                      <p className="mt-2 whitespace-pre-wrap">{c.body}</p>
                      {c.status === "sent" ? (
                        <p role="status">
                          {t("delivered", { count: c.delivered })}
                        </p>
                      ) : (
                        <CampaignSend id={c.id} />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}
