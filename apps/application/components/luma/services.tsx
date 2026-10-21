"use client";
import { useTrainingEvent } from "@repo/ui/training";
import { ServiceEligibilitySummary } from "@repo/ui/sports-eligibility";
import { ServiceCover } from "@repo/ui/sports-cover";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  const t = useLuma();
  const locale = useLocale();
  const [q, setQ] = useState("");
  const search = useDeferredValue(q);
  useTrainingEvent("discovery_searched");
  const query = useSportsQuery<ServiceDto[]>("sports/services", {
    q: search,
    organizationId,
    branchId,
  });
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
      <QueryState query={query}>
        {query.data?.map((s) => (
          <Row
            key={s.id}
            title={s.title}
            meta={[s.clubName, stamp(s.nextStartAt, locale)]
              .filter(Boolean)
              .join(" · ")}
            href={`/services/detail?id=${s.id}`}
          >
            <span className="luma-meta">
              <Price value={s.amountMinor} />
            </span>
          </Row>
        ))}
        {!query.data?.length && <Empty />}
      </QueryState>
    </LumaPage>
  );
}
export function ServiceDetail() {
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
  const waiting = useSportsCommand("sports/account/waitlist");
  if (!id)
    return (
      <LumaPage title={t("services")} back="/services">
        <Empty />
      </LumaPage>
    );
  return (
    <LumaPage title={query.data?.title ?? t("services")} back="/services">
      <QueryState query={query}>
        {query.data && (
          <>
            <p className="luma-meta">
              {[
                query.data.clubName,
                query.data.branchName,
                query.data.coachName,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <ServiceCover cover={query.data.cover} />
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
            <Section title={t("conditions")}>
              <p className="luma-meta whitespace-pre-wrap">
                {query.data.policy.terms}
              </p>
            </Section>
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
            {query.data.kind === "membership" ? (
              <Link className="luma-cta" href={`/checkout?service=${id}`}>
                {t("continue")}
              </Link>
            ) : (
              <Section
                title={t(
                  query.data.kind === "course"
                    ? "courseSchedule"
                    : "chooseSession",
                )}
              >
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
                        onClick={() => waiting.mutate({ occurrenceId: o.id })}
                      >
                        {t("waitlist")}
                      </button>
                    )}
                  </div>
                ))}
                {!query.data.occurrences.length && <Empty />}
              </Section>
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
