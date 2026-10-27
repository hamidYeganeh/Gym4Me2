"use client";
import { useListState } from "@repo/ui/hooks/use-list-state";
import { useTrainingEvent } from "@repo/ui/training";
import { ServiceEligibilitySummary } from "@repo/ui/sports-eligibility";
import { ServiceCover, ServiceCoverThumbnail } from "@repo/ui/sports-cover";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { isPrimaryService, primaryServiceKinds } from "../../lib/product-scope";
import { PurchaseConditions } from "./purchase-conditions";
import { BottomSheet } from "@repo/ui/kit/BottomSheet";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "@repo/i18n";
import { useLocale } from "@repo/i18n";
import {
  useSportsQuery,
  useSportsCommand,
  type ServiceDto,
} from "@repo/api/sports";
import {
  CommandError,
  Empty,
  Field,
  LumaPage,
  Price,
  QueryState,
  Row,
  Section,
  stamp,
  useLuma,
} from "./common";
export function ServicesPage({
  organizationId,
  branchId,
  back = "/discovery",
}: { organizationId?: string; branchId?: string; back?: string } = {}) {
  const w = useTranslations("Workflow");
  const [sport, setSport] = useState("");
  const searchParams = useSearchParams();
  const [kind, setKind] = useState(() => {
    const requested = searchParams.get("kind") ?? "";
    return [
      "class",
      "course",
      "court",
      "access",
      "membership",
      "program",
    ].includes(requested)
      ? requested
      : "";
  });
  const sports =
    useSportsQuery<{ id: string; name: string; formats: string[] }[]>(
      "sports/formats",
    );
  const t = useLuma();
  const locale = useLocale();
  const [q, setQ] = useListState(
    "search",
    "",
    (v): v is string => typeof v === "string",
    `${organizationId ?? ""}:${branchId ?? ""}`,
  );
  const search = useDeferredValue(q);
  useTrainingEvent("discovery_searched");
  const query = useSportsQuery<ServiceDto[]>("sports/services", {
    q: search,
    sportId: sport || undefined,
    kind: kind || undefined,
    organizationId,
    branchId,
  });
  const availableFormats = sports.data?.find((s) => s.id === sport)?.formats;
  return (
    <LumaPage title={t("services")} back={back}>
      <Field label={t("search")}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          maxLength={160}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={w("sport")}>
          <select
            value={sport}
            onChange={(e) => {
              setSport(e.target.value);
              setKind("");
            }}
          >
            <option value="">{w("allSports")}</option>
            {sports.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={w("format")}>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">{w("allFormats")}</option>
            {(kind === "program" ? (["program"] as const) : primaryServiceKinds)
              .filter(
                (k) =>
                  !sport || !availableFormats || availableFormats.includes(k),
              )
              .map((k) => (
                <option key={k} value={k}>
                  {w(`actions.${k}`)}
                </option>
              ))}
          </select>
        </Field>
      </div>
      <QueryState query={query}>
        {query.data
          ?.filter((s) => kind === "program" || isPrimaryService(s.kind))
          .map((s) => (
            <Row
              key={s.id}
              title={s.title}
              icon={<ServiceCoverThumbnail cover={s.cover} />}
              meta={[
                s.sportName,
                w(`actions.${s.kind}`),
                s.clubName,
                stamp(s.nextStartAt, locale),
              ]
                .filter(Boolean)
                .join(" · ")}
              href={`/services/detail?id=${s.id}`}
            >
              <span className="luma-meta">
                <Price value={s.amountMinor} />
              </span>
            </Row>
          ))}
        {!query.data?.some(
          (s) => kind === "program" || isPrimaryService(s.kind),
        ) && <Empty illustration="punchingBag" />}
      </QueryState>
    </LumaPage>
  );
}
export function ServiceDetail() {
  const w = useTranslations("Workflow");
  const params = useSearchParams();
  const id = params.get("id");
  useTrainingEvent("service_selected", id);
  const t = useLuma();
  const locale = useLocale();
  const query = useSportsQuery<ServiceDto>(
    `sports/services/${id}`,
    undefined,
    Boolean(id),
  );
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const waiting = useSportsCommand("sports/account/waitlist");
  if (!id)
    return (
      <LumaPage title={t("services")} back="/services">
        <Empty />
      </LumaPage>
    );
  return (
    <LumaPage
      title={t("details")}
      back="/services"
      className="luma-service-detail"
    >
      <QueryState query={query}>
        {query.data && (
          <>
            <ServiceCover cover={query.data.cover} />
            <div className="service-detail-heading">
              <h2>{query.data.title}</h2>
              <p className="luma-meta">
                {[
                  query.data.clubName,
                  query.data.branchName,
                  query.data.coachName,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <Section title={t("description")}>
              <p className="leading-8 whitespace-pre-wrap">
                {query.data.description}
              </p>
              <p className="mt-4 font-semibold">
                <Price value={query.data.amountMinor} />
              </p>
            </Section>
            <Section title={t("details")}>
              <dl className="flex flex-col gap-3">
                <div className="flex justify-between gap-4">
                  <dt className="luma-meta">{t("kind")}</dt>
                  <dd>{t(`kinds.${query.data.kind}`)}</dd>
                </div>
                {query.data.level && (
                  <div className="flex justify-between gap-4">
                    <dt className="luma-meta">{t("level")}</dt>
                    <dd className="min-w-0 text-end wrap-anywhere">
                      {query.data.level}
                    </dd>
                  </div>
                )}
                {query.data.sessionCount !== null && (
                  <div className="flex justify-between gap-4">
                    <dt className="luma-meta">{t("sessions")}</dt>
                    <dd>
                      {new Intl.NumberFormat(locale).format(
                        query.data.sessionCount,
                      )}
                    </dd>
                  </div>
                )}
                {query.data.kind === "membership" &&
                  query.data.durationDays !== null && (
                    <div className="flex justify-between gap-4">
                      <dt className="luma-meta">{t("validityDays")}</dt>
                      <dd>
                        {new Intl.NumberFormat(locale).format(
                          query.data.durationDays,
                        )}
                      </dd>
                    </div>
                  )}
              </dl>
            </Section>
            <PurchaseConditions
              kind={query.data.kind}
              policy={query.data.policy}
              offering={query.data.offering}
              approvalRequired={query.data.approvalRequired}
            />
            <ServiceEligibilitySummary value={query.data.eligibility} />
            {query.data.requirements.length > 0 && (
              <Section title={t("requiredDocuments")}>
                {query.data.requirements.map((r) => (
                  <p key={r}>{r}</p>
                ))}
                <Link className="luma-cta" href={`/documents?service=${id}`}>
                  {t("documents")}
                </Link>
              </Section>
            )}
            {["membership", "program"].includes(query.data.kind) ? (
              <Link className="luma-cta" href={`/checkout?service=${id}`}>
                {w(`actions.${query.data.kind}`)}
              </Link>
            ) : (
              <>
                <button
                  className="luma-cta service-book-action"
                  type="button"
                  onClick={() => setSessionsOpen(true)}
                >
                  {t(
                    query.data.kind === "course"
                      ? "courseSchedule"
                      : "chooseSession",
                  )}
                </button>
                <BottomSheet
                  open={sessionsOpen}
                  onOpenChange={setSessionsOpen}
                  title={t("chooseSession")}
                  description={query.data.title}
                >
                  <div className="service-session-options">
                    {query.data.kind === "course" && (
                      <p className="luma-meta mb-4">
                        {t("courseRegistrationHint")}
                      </p>
                    )}
                    {query.data.occurrences.map((o) => (
                      <div key={o.id} className="luma-group mb-3">
                        <Row
                          title={stamp(o.startAt, locale)}
                          meta={
                            o.resourceAvailable === false
                              ? t("resourceUnavailableSlot")
                              : `${t("capacity")}: ${new Intl.NumberFormat(locale).format(o.remaining)}`
                          }
                          href={
                            o.remaining > 0 && o.resourceAvailable !== false
                              ? `/checkout?service=${id}&occurrence=${o.id}`
                              : undefined
                          }
                        />
                        {o.remaining === 0 && o.resourceAvailable !== false && (
                          <button
                            className="luma-cta mb-3"
                            disabled={waiting.isPending}
                            onClick={() =>
                              waiting.mutate({ occurrenceId: o.id })
                            }
                          >
                            {t("waitlist")}
                          </button>
                        )}
                      </div>
                    ))}
                    {!query.data.occurrences.length && <Empty />}
                  </div>
                  <CommandError error={waiting.error} />
                  {waiting.isSuccess && (
                    <Link className="luma-cta" href="/waitlist">
                      {t("waitlist")}
                    </Link>
                  )}
                </BottomSheet>
              </>
            )}
            <CommandError error={waiting.error} />
            {waiting.isSuccess && (
              <Link href="/waitlist" className="luma-cta">
                {t("waitlist")}
              </Link>
            )}
          </>
        )}
      </QueryState>
    </LumaPage>
  );
}
