"use client";
import { DiscoveryContentSections } from "@repo/ui/discovery-content";
import { clubClassPath, belongsToClubClass } from "../../lib/club-class-route";
import { CatalogState } from "../discovery/catalog-state";
import { useApiContext } from "@repo/api/provider";
import { ClassCard } from "@repo/ui/kit/ClassCard";
import { catalogIcon } from "@repo/ui/icons/catalog";
import { SportCard } from "@repo/ui/kit/SportCard";
import { serviceHref } from "@repo/ui/lib/public-route";
import {
  useSportsCommand,
  useSportsQuery,
  type ServiceDto,
} from "@repo/api/sports";
import { useLocale, useTranslations } from "@repo/i18n";
import { useListState } from "@repo/ui/hooks/use-list-state";
import { Button } from "@repo/ui/kit/Button";
import { BottomSheet } from "@repo/ui/kit/BottomSheet";
import { Input as KitInput } from "@repo/ui/kit/Input";
import { ServiceCover, ServiceCoverThumbnail } from "@repo/ui/sports-cover";
import { ServiceEligibilitySummary } from "@repo/ui/sports-eligibility";
import { useTrainingEvent } from "@repo/ui/training";
import Link from "next/link";
import { storeCheckoutSelection } from "../../lib/checkout-selection";
import { useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useState } from "react";
import { isPrimaryService, primaryServiceKinds } from "../../lib/product-scope";
import {
  amount,
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
  organizationId: organizationRef,
  branchId,
  back = "/discovery",
  fixedKind,
  clubSlug,
  clubName,
}: {
  organizationId?: string;
  branchId?: string;
  back?: string;
  fixedKind?: "class";
  clubSlug?: string;
  clubName?: string;
} = {}) {
  const w = useTranslations("Workflow");
  const cardCopy = useTranslations("ClassCatalog");
  const { api } = useApiContext();
  const discovery = useTranslations("DiscoveryRoutes");
  const [sport, setSport] = useState("");
  const searchParams = useSearchParams();
  const organizationId =
    organizationRef ??
    (process.env.NEXT_PUBLIC_NATIVE_EXPORT === "true"
      ? (searchParams.get("organizationId") ?? undefined)
      : undefined);
  const [kind, setKind] = useState(() => {
    const requested = searchParams.get("kind") ?? "";
    return isPrimaryService(requested) ? requested : "";
  });
  const sports = useSportsQuery<
    {
      id: string;
      name: string;
      formats: string[];
      imageUrl?: string | null;
      iconName?: string | null;
    }[]
  >("sports/formats");
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
    kind: fixedKind ?? (kind || undefined),
    organizationId,
    branchId,
  });
  const availableFormats = sports.data?.find((s) => s.id === sport)?.formats;
  const primaryServices = query.data?.filter(
    (s) =>
      isPrimaryService(s.kind) &&
      (!fixedKind || s.kind === fixedKind) &&
      (!organizationId || s.organizationId === organizationId),
  );
  return (
    <LumaPage
      title={fixedKind ? discovery("classes") : t("services")}
      back={back}
    >
      {fixedKind === "class" && !organizationId && (
        <DiscoveryContentSections page="classes" />
      )}
      {clubName && <p className="text-lg font-medium">{clubName}</p>}
      <Field label={t("search")}>
        <KitInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          maxLength={160}
        />
      </Field>
      <div className="space-y-4">
        <section className="space-y-3" aria-label={w("sport")}>
          <h2 className="text-sm font-medium text-muted-foreground">
            {w("sport")}
          </h2>
          <div
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 py-2"
            role="group"
            aria-label={w("sport")}
          >
            <SportCard
              name={w("allSports")}
              selected={!sport}
              onClick={() => {
                setSport("");
                if (!fixedKind) setKind("");
              }}
            />
            {sports.data?.map((item) => (
              <SportCard
                key={item.id}
                name={item.name}
                image={item.imageUrl}
                icon={catalogIcon(item.iconName)}
                selected={sport === item.id}
                onClick={() => {
                  setSport(item.id);
                  if (!fixedKind) setKind("");
                }}
              />
            ))}
          </div>
        </section>
        {!fixedKind && (
          <Field label={w("format")}>
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">{w("allFormats")}</option>
              {primaryServiceKinds
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
        )}
      </div>
      <QueryState query={query}>
        {fixedKind === "class" || kind === "class" ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {primaryServices?.map((service, index) => {
              const first =
                service.occurrences?.find(
                  (occurrence) => occurrence.startAt === service.nextStartAt,
                ) ?? service.occurrences?.[0];
              const duration = first
                ? Math.round(
                    (Date.parse(first.endAt) - Date.parse(first.startAt)) /
                      60_000,
                  )
                : undefined;
              return (
                <ClassCard
                  key={service.id}
                  locale={locale}
                  priority={index === 0}
                  className="max-w-none"
                  href={
                    service.publicId
                      ? clubSlug
                        ? clubClassPath(clubSlug, service.publicId)
                        : serviceHref(service.publicId)
                      : undefined
                  }
                  classItem={{
                    id: service.id,
                    title: service.title,
                    coachName: service.coachName,
                    level: service.level ?? "",
                    minutes: duration && duration > 0 ? duration : undefined,
                    priceLabel: `${amount(service.amountMinor, locale)} ${t("toman")}`,
                    photo: service.cover
                      ? {
                          src: `${api.scope[1]}/sports/media/${encodeURIComponent(service.cover.id)}`,
                          alt: service.cover.alt,
                        }
                      : undefined,
                  }}
                  labels={{
                    save: cardCopy("save"),
                    unsave: cardCopy("unsave"),
                    minutes: cardCopy("minutes"),
                    calories: cardCopy("calories"),
                    score: cardCopy("score"),
                  }}
                />
              );
            })}
          </div>
        ) : (
          primaryServices?.map((s) => (
            <Row
              key={s.id}
              motionKey={`class-${s.id}`}
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
              href={
                s.publicId
                  ? clubSlug
                    ? clubClassPath(clubSlug, s.publicId)
                    : serviceHref(s.publicId)
                  : undefined
              }
            >
              <span className="luma-meta">
                <Price value={s.amountMinor} />
              </span>
            </Row>
          ))
        )}
        {!primaryServices?.length && (
          <Empty
            illustration="punchingBag"
            action={
              fixedKind ? (
                <Button asChild variant="outline">
                  <Link href={back}>{discovery("backToClub")}</Link>
                </Button>
              ) : undefined
            }
          />
        )}
      </QueryState>
    </LumaPage>
  );
}
export function ServiceDetail({
  serviceRef,
  back = "/services",
  expectedClubId,
  initialService,
}: {
  serviceRef?: string;
  back?: string;
  expectedClubId?: string;
  initialService?: ServiceDto;
} = {}) {
  const router = useRouter();
  const w = useTranslations("Workflow");
  const params = useSearchParams();
  const id = serviceRef ?? params.get("id");
  useTrainingEvent("service_selected", id);
  const t = useLuma();
  const locale = useLocale();
  const query = useSportsQuery<ServiceDto>(
    `sports/services/${id}`,
    undefined,
    Boolean(id),
    false,
    initialService,
  );
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const waiting = useSportsCommand("sports/account/waitlist");
  if (
    query.data &&
    expectedClubId &&
    !belongsToClubClass(query.data, expectedClubId)
  )
    return (
      <LumaPage title={t("details")} back={back}>
        <CatalogState missing />
      </LumaPage>
    );
  if (!id)
    return (
      <LumaPage title={t("services")} back={back}>
        <Empty />
      </LumaPage>
    );
  return (
    <LumaPage title={t("details")} back={back} className="luma-service-detail">
      <QueryState query={query}>
        {query.data && (
          <>
            <section
              data-zoom-enter-key={`class-${query.data.id}`}
              className="min-w-0"
            >
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
              <p className="mb-5 font-semibold">
                <Price value={query.data.amountMinor} />
              </p>
            </section>
            <Section title={t("description")}>
              <p className="leading-8 whitespace-pre-wrap">
                {query.data.description}
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
            <details className="service-conditions">
              <summary>{t("conditions")}</summary>
              <p className="luma-meta whitespace-pre-wrap">
                {query.data.policy.terms}
              </p>
            </details>
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
                        />
                        {o.remaining > 0 && o.resourceAvailable !== false && (
                          <button
                            type="button"
                            className="luma-cta"
                            onClick={() => {
                              storeCheckoutSelection(
                                query.data!.publicId,
                                o.id,
                              );
                              router.push("/checkout");
                            }}
                          >
                            {w(`actions.${query.data.kind}`)}
                          </button>
                        )}
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
