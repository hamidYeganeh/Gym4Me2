"use client";
import { useMediaPreview } from "@repo/api/catalog";
import { useTranslations, useLocale } from "@repo/i18n";

import {
  useAdminUser,
  useAdminOrganization,
  useAdminClub,
  useAdminBranch,
  useAdminReadiness,
  useSetUserStatus,
  useReviewOrganization,
} from "@repo/api/admin";
import type {
  NamedDto as Named,
  PhoneDto as Phone,
  MediaDto as Media,
} from "@repo/api/catalog";
import type { UserStatus } from "@repo/api/auth";
import type { OrganizationStatus } from "@repo/api/business";

import Link from "next/link";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { Badge } from "@repo/ui/kit/Badge";
import { Button } from "@repo/ui/kit/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/kit/Card";

import {
  Blank,
  Loading,
  QueryError,
  Status,
  useDateLabel,
  useRoleNames,
} from "./common";
import { AdminAuditContent, DecisionDialog, type Decision } from "./admin";

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  );
}
function Facts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="mt-2 text-sm leading-6">{item.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
function Terms({ items }: { items: Named[] }) {
  const t = useTranslations();

  return items.length ? (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item.id} variant="secondary">
          {item.name}
        </Badge>
      ))}
    </div>
  ) : (
    <p className="text-sm text-muted-foreground">{t("Copy.notProvided")}</p>
  );
}
function Phones({ items }: { items: Phone[] }) {
  const t = useTranslations();

  return (
    <div className="flex flex-wrap gap-4">
      {items.length ? (
        items.map((p, i) => (
          <p key={i} className="text-sm">
            {p.label && `${p.label}: `}
            <bdi>{p.number}</bdi>
          </p>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">{t("Copy.notProvided")}</p>
      )}
    </div>
  );
}
function Gallery({ items, clubId }: { items: Media[]; clubId: string }) {
  const t = useTranslations();

  return items.length ? (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((m) => <PreviewMedia key={m.id} media={m} clubId={clubId} />)}
    </div>
  ) : (
    <p className="text-sm text-muted-foreground">{t("Copy.noMediaProvided")}</p>
  );
}
function PreviewMedia({ media, clubId }: { media: Media; clubId: string }) {
  const t = useTranslations();
  const query = useMediaPreview(clubId, media.id);
  if (query.isError) return <QueryError error={query.error} retry={query.refetch} />;
  if (!query.data) return <Loading />;
  return <a href={query.data.url} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-xl border hover:border-primary">
    {media.type === "image" ? <Image src={query.data.url} alt={media.alt ?? t("Copy.clubImage")} width={480} height={320} unoptimized className="aspect-[3/2] w-full object-cover" /> : <div className="grid aspect-[3/2] place-items-center bg-muted text-sm">{t("Copy.viewVideo")}</div>}
    <p className="p-3 text-sm">{media.caption || media.alt || t("Copy.viewMedia")}</p>
  </a>;
}

export function AdminOrganizationDetailContent({ id }: { id: string }) {
  const locale = useLocale();
  const roleNames = useRoleNames();
  const dateLabel = useDateLabel();

  const t = useTranslations();

  const reviewMutation = useReviewOrganization();

  const org = useAdminOrganization(id);
  const club = useAdminClub(id, Boolean(org.data?.hasCatalog));
  const readiness = useAdminReadiness(id, Boolean(org.data?.hasCatalog));
  const [decision, setDecision] = useState<Decision | null>(null);
  async function save(reason: string) {
    if (!decision) return;
    await reviewMutation.mutateAsync({
      id: id,
      input: {
        status: decision.status as Exclude<OrganizationStatus, "pending">,
        reason,
      },
    });
  }
  return (
    <>
      <Button variant="ghost" className="justify-self-start" asChild>
        <Link href="/organizations">{t("Copy.backToOrganizations")}</Link>
      </Button>
      <QueryError error={org.error} retry={org.refetch} />
      {org.isLoading ? (
        <Loading />
      ) : (
        org.data && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">{org.data.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("Copy.registeredOn")} {dateLabel(org.data.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Status value={org.data.status} />
                {club.data && <Status value={club.data.publicationStatus} />}
              </div>
            </div>
            <DetailCard title={t("Copy.reviewOrganization")}>
              <p className="text-sm leading-7 text-muted-foreground">
                {t("Copy.reviewTheRecordThenSaveYourDecision")}{" "}
              </p>
              {org.data.reviewReason && (
                <p className="whitespace-pre-wrap text-sm leading-7">
                  {t("Copy.lastDecisionReason")} {org.data.reviewReason}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                {[
                  { status: "approved", label: t("Copy.approveOrganization") },
                  { status: "rejected", label: t("Copy.rejectOrganization") },
                  { status: "suspended", label: t("Copy.suspendOrganization") },
                ]
                  .filter((item) => item.status !== org.data?.status)
                  .map((item) => (
                    <Button
                      key={item.status}
                      variant="outline"
                      onClick={() =>
                        setDecision({
                          id,
                          status: item.status,
                          title: `${item.label} ${org.data?.name}`,
                        })
                      }
                    >
                      {item.label}
                    </Button>
                  ))}
              </div>
            </DetailCard>
            <QueryError error={club.error} retry={club.refetch} />
            <QueryError error={readiness.error} retry={readiness.refetch} />
            {club.isLoading || readiness.isLoading ? (
              <Loading />
            ) : (
              club.data && (
                <>
                  <div className="grid gap-5 lg:grid-cols-2">
                    <DetailCard title={t("Copy.clubInformation")}>
                      <Facts
                        items={[
                          {
                            label: t("Copy.owner"),
                            value: (
                              <Link
                                className="hover:underline"
                                href={`/users/${club.data.owner.id}`}
                              >
                                {club.data.owner.displayName ??
                                  t("Copy.unnamed")}
                              </Link>
                            ),
                          },
                          {
                            label: t("Copy.operatingStatus"),
                            value: <Status value={club.data.operatingStatus} />,
                          },
                          {
                            label: t("Copy.lastApproval"),
                            value: club.data.lastVerifiedAt
                              ? dateLabel(club.data.lastVerifiedAt)
                              : t("Copy.notReviewed"),
                          },
                          {
                            label: t("Copy.publicRating"),
                            value: t("Copy.ratingSummary", {
                              average:
                                club.data.rating.average?.toLocaleString(
                                  locale,
                                ) ?? "—",
                              count:
                                club.data.rating.count.toLocaleString(locale),
                            }),
                          },
                        ]}
                      />
                      <p className="whitespace-pre-wrap text-sm leading-7">
                        {club.data.description ||
                          t("Copy.noClubDescriptionProvided")}
                      </p>
                      {club.data.archivedAt && (
                        <p className="text-sm text-destructive">
                          {t("Copy.thisClubIsArchived")}{" "}
                        </p>
                      )}
                    </DetailCard>
                    <DetailCard title={t("Copy.publicationReadiness")}>
                      {readiness.data &&
                        (readiness.data.ready ? (
                          <p className="text-sm leading-7">
                            {t(
                              "Copy.allRequiredPublicationInformationIsComplete",
                            )}{" "}
                          </p>
                        ) : (
                          <ul className="list-inside list-disc space-y-2 text-sm leading-7">
                            {readiness.data.errors.map((error) => (
                              <li key={error.field}>{error.message}</li>
                            ))}
                          </ul>
                        ))}
                      <p className="text-xs leading-6 text-muted-foreground">
                        {t(
                          "Copy.thisChecksCompletenessAdministratorsAreResponsibleFor",
                        )}{" "}
                      </p>
                    </DetailCard>
                  </div>
                  <div className="grid gap-5 lg:grid-cols-2">
                    <DetailCard title={t("Copy.clubTypeAndSports")}>
                      <Terms items={club.data.categories} />
                      <Terms items={club.data.sports} />
                      <Terms items={club.data.tags} />
                    </DetailCard>
                    <DetailCard title={t("Copy.contactDetails")}>
                      <Phones items={club.data.phones} />
                      <div className="flex flex-wrap gap-3">
                        {club.data.socials.map((social, i) => (
                          <a
                            key={i}
                            href={social.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm underline"
                          >
                            {social.platform}
                          </a>
                        ))}
                      </div>
                    </DetailCard>
                  </div>
                  <DetailCard title={t("Copy.clubMedia")}>
                    <Gallery
                      clubId={club.data.id}
                      items={
                        club.data.cover
                          ? [
                              club.data.cover,
                              ...club.data.gallery.filter(
                                (m) => m.id !== club.data?.cover?.id,
                              ),
                            ]
                          : club.data.gallery
                      }
                    />
                  </DetailCard>
                </>
              )
            )}
            {!org.data.hasCatalog && (
              <Blank
                title={t("Copy.clubProfileIsIncomplete")}
                description={t("Copy.thisOrganizationHasBeenRegisteredButHas")}
              />
            )}
            <div className="grid gap-5 lg:grid-cols-2">
              <DetailCard title={t("Copy.branches")}>
                {org.data.branches.length ? (
                  org.data.branches.map((branch) => (
                    <Link
                      key={branch.id}
                      href={`/organizations/${id}/branches/${branch.id}`}
                      className="flex justify-between gap-3 rounded-lg border p-4 text-sm hover:bg-muted"
                    >
                      <span>{branch.name}</span>
                      <span className="text-muted-foreground">
                        {t("Copy.viewRecord")}{" "}
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("Copy.noBranchesYet")}{" "}
                  </p>
                )}
              </DetailCard>
              <DetailCard title={t("Copy.teamMembers")}>
                {org.data.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 border-b pb-3 last:border-0"
                  >
                    <Link
                      className="text-sm hover:underline"
                      href={`/users/${member.userId}`}
                    >
                      {member.displayName ?? t("Copy.unnamed")}
                    </Link>
                    <Badge variant="secondary">
                      {roleNames[member.role] ?? member.role}
                    </Badge>
                  </div>
                ))}
              </DetailCard>
            </div>
            <DetailCard title={t("Copy.organizationHistory")}>
              <AdminAuditContent organizationId={id} />
            </DetailCard>
          </>
        )
      )}
      <DecisionDialog
        key={`${decision?.id}-${decision?.status}`}
        decision={decision}
        close={() => setDecision(null)}
        save={save}
        kind="organization"
      />
    </>
  );
}

function useTimeLabel() {
  const t = useTranslations();
  return (minute: number) => {
    return `${String(Math.floor((minute % 1440) / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}${minute >= 1440 ? t("Copy.nextDay") : ""}`;
  };
}
export function AdminBranchDetailContent({
  organizationId,
  branchId,
}: {
  organizationId: string;
  branchId: string;
}) {
  const locale = useLocale();

  const t = useTranslations();

  const days = [
    t("Copy.saturday"),
    t("Copy.sunday"),
    t("Copy.monday"),
    t("Copy.tuesday"),
    t("Copy.wednesday"),
    t("Copy.thursday"),
    t("Copy.friday"),
  ];
  const audienceNames: Record<string, string> = {
    all: t("Copy.everyone"),
    women: t("Copy.women"),
    men: t("Copy.men"),
    mixed: t("Copy.mixed"),
    private: t("Copy.privateAudience"),
    family: t("Copy.family"),
  };

  const timeLabel = useTimeLabel();

  const org = useAdminOrganization(organizationId);
  const query = useAdminBranch(
    organizationId,
    branchId,
    Boolean(org.data?.hasCatalog),
  );
  const base = org.data?.branches.find((b) => b.id === branchId);
  return (
    <>
      <Button variant="ghost" className="justify-self-start" asChild>
        <Link href={`/organizations/${organizationId}`}>
          {t("Copy.backToOrganizationRecord")}{" "}
        </Link>
      </Button>
      <QueryError error={org.error} retry={org.refetch} />
      <QueryError error={query.error} retry={query.refetch} />
      {org.isLoading || query.isLoading ? (
        <Loading />
      ) : query.data ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{org.data?.name}</p>
              <h2 className="mt-2 text-2xl font-semibold">{query.data.name}</h2>
            </div>
            <div className="flex gap-2">
              {query.data.isMain && (
                <Badge variant="secondary">{t("Copy.mainBranch")}</Badge>
              )}
              <Status value={query.data.operatingStatus} />
            </div>
          </div>
          <DetailCard title={t("Copy.locationAndVisiting")}>
            <Facts
              items={[
                {
                  label: t("Copy.address"),
                  value: query.data.location.address,
                },
                {
                  label: t("Copy.neighborhood"),
                  value: query.data.location.neighborhood,
                },
                {
                  label: t("Copy.location"),
                  value: query.data.location.coordinates ? (
                    <bdi>{query.data.location.coordinates.join(", ")}</bdi>
                  ) : (
                    t("Copy.notProvided")
                  ),
                },
                {
                  label: t("Copy.timeZone"),
                  value: <bdi>{query.data.timezone}</bdi>,
                },
              ]}
            />
            <Phones items={query.data.phones} />
            <p className="text-sm leading-7">
              {query.data.visitInstructions ||
                t("Copy.noVisitingInstructionsProvided")}
            </p>
            {query.data.archivedAt && (
              <p className="text-sm text-destructive">
                {t("Copy.thisBranchIsArchived")}{" "}
              </p>
            )}
          </DetailCard>
          <div className="grid gap-5 lg:grid-cols-2">
            <DetailCard title={t("Copy.openingHours")}>
              {query.data.openingHours.weekly.length ? (
                query.data.openingHours.weekly.map((hours, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap justify-between gap-2 border-b pb-3 text-sm last:border-0"
                  >
                    <span>
                      {days[hours.dayOfWeek]} ·{" "}
                      {audienceNames[hours.audience] ?? hours.audience}
                    </span>
                    <bdi>
                      {timeLabel(hours.startMinute)} —{" "}
                      {timeLabel(hours.endMinute)}
                    </bdi>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("Copy.noOpeningHoursProvided")}{" "}
                </p>
              )}
            </DetailCard>
            <DetailCard title={t("Copy.exceptionsAndClosures")}>
              {query.data.openingHours.exceptions.length ? (
                query.data.openingHours.exceptions.map((exception, i) => (
                  <div
                    key={i}
                    className="grid gap-2 border-b pb-3 text-sm last:border-0"
                  >
                    <p>
                      <bdi>{exception.date}</bdi> ·{" "}
                      {audienceNames[exception.audience] ?? exception.audience}
                    </p>
                    <p>
                      {exception.isClosed
                        ? t("Copy.closed")
                        : exception.intervals
                            .map((v) =>
                              t("Copy.timeInterval", {
                                start: timeLabel(v.startMinute),
                                end: timeLabel(v.endMinute),
                              }),
                            )
                            .join("، ")}
                    </p>
                    {exception.reason && (
                      <p className="text-muted-foreground">
                        {exception.reason}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("Copy.noExceptionsProvided")}{" "}
                </p>
              )}
            </DetailCard>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <DetailCard title={t("Copy.sportsAndEquipment")}>
              <Terms items={query.data.sports} />
              {query.data.equipments.map((item) => (
                <p key={item.id} className="text-sm leading-7">
                  {item.name}
                  {item.quantity !== null &&
                    t("Copy.equipmentQuantity", {
                      count: item.quantity.toLocaleString(locale),
                    })}
                  {item.description && ` · ${item.description}`}
                </p>
              ))}
            </DetailCard>
            <DetailCard title={t("Copy.amenitiesAndAccessibility")}>
              <Terms items={query.data.amenities} />
              <Terms items={query.data.accessibilityFeatures} />
            </DetailCard>
          </div>
          <DetailCard title={t("Copy.rulesAndAudience")}>
            <Facts
              items={[
                {
                  label: t("Copy.audience"),
                  value: query.data.audiencePolicies?.audiences
                    ?.map((v) => audienceNames[v] ?? v)
                    .join("، "),
                },
                {
                  label: t("Copy.minimumAge"),
                  value:
                    query.data.audiencePolicies?.minimumAge?.toLocaleString(
                      locale,
                    ),
                },
              ]}
            />
            <p className="whitespace-pre-wrap text-sm leading-7">
              {query.data.rules || t("Copy.noRulesProvided")}
            </p>
          </DetailCard>
          <div className="grid gap-5 lg:grid-cols-2">
            <DetailCard title={t("Copy.trainingSpaces")}>
              {query.data.spaces.length ? (
                query.data.spaces.map((space) => (
                  <div
                    key={space.id}
                    className="flex flex-wrap items-center justify-between gap-3 text-sm"
                  >
                    <p>
                      {space.name} {t("Copy.capacity")}{" "}
                      {space.capacity?.toLocaleString(locale) ??
                        t("Copy.notProvided")}
                    </p>
                    <Status value={space.operatingStatus} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("Copy.noTrainingSpacesProvided")}{" "}
                </p>
              )}
            </DetailCard>
            <DetailCard title={t("Copy.affiliatedCoaches")}>
              {query.data.coaches.length ? (
                query.data.coaches.map((coach) => (
                  <div key={coach.id}>
                    <Link
                      className="text-sm font-medium hover:underline"
                      href={`/users/${coach.coachId}`}
                    >
                      {coach.displayName ?? t("Copy.unnamed")}
                    </Link>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      {coach.biography}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("Copy.noActiveCoaches")}{" "}
                </p>
              )}
            </DetailCard>
          </div>
          <DetailCard title={t("Copy.branchGallery")}>
            <Gallery items={query.data.gallery} clubId={query.data.clubId} />
          </DetailCard>
        </>
      ) : (
        org.data &&
        !query.error && (
          <Blank
            title={base ? base.name : t("Copy.branchNotFound")}
            description={
              base
                ? t("Copy.thisBranchHasNoCatalogProfileYet")
                : t("Copy.thisBranchDoesNotBelongToThe")
            }
          />
        )
      )}
    </>
  );
}

export function AdminUserDetailContent({ id }: { id: string }) {
  const roleNames = useRoleNames();
  const dateLabel = useDateLabel();

  const t = useTranslations();

  const clientNames: Record<string, string> = {
    admin: t("Copy.admin"),
    business: t("Copy.business"),
    application: t("Copy.athleteAndCoach"),
  };

  const statusMutation = useSetUserStatus();

  const query = useAdminUser(id);
  const [decision, setDecision] = useState<Decision | null>(null);
  async function save(reason: string) {
    if (!decision) return;
    await statusMutation.mutateAsync({
      id: id,
      input: { status: decision.status as UserStatus, reason },
    });
  }
  return (
    <>
      <Button variant="ghost" className="justify-self-start" asChild>
        <Link href="/users">{t("Copy.backToUsers")}</Link>
      </Button>
      <QueryError error={query.error} retry={query.refetch} />
      {query.isLoading ? (
        <Loading />
      ) : (
        query.data && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">
                {query.data.displayName ?? t("Copy.unnamedUser")}
              </h2>
              <div className="flex gap-2">
                <Status value={query.data.status} />
                {query.data.isAdmin && (
                  <Badge variant="secondary">
                    {t("Copy.platformAdministrator")}
                  </Badge>
                )}
              </div>
            </div>
            <DetailCard title={t("Copy.userAccount")}>
              <Facts
                items={[
                  {
                    label: t("Copy.mobileNumber"),
                    value: <bdi>{query.data.phone}</bdi>,
                  },
                  {
                    label: t("Copy.joined"),
                    value: dateLabel(query.data.createdAt),
                  },
                  {
                    label: t("Copy.phoneVerified"),
                    value: query.data.phoneVerifiedAt
                      ? dateLabel(query.data.phoneVerifiedAt)
                      : t("Copy.notVerified"),
                  },
                ]}
              />
              {!query.data.isAdmin && (
                <Button
                  className="justify-self-start"
                  variant="outline"
                  onClick={() =>
                    setDecision({
                      id,
                      title:
                        query.data?.status === "active"
                          ? t("Copy.suspendUserAccount")
                          : t("Copy.activateUserAccount"),
                      status:
                        query.data?.status === "active"
                          ? "suspended"
                          : "active",
                    })
                  }
                >
                  {query.data.status === "active"
                    ? t("Copy.suspendAccount")
                    : t("Copy.activateAccount")}
                </Button>
              )}
            </DetailCard>
            <DetailCard title={t("Copy.organizationAffiliations")}>
              {query.data.memberships.length ? (
                query.data.memberships.map((member) => (
                  <div
                    key={member.id}
                    className="flex justify-between gap-3 text-sm"
                  >
                    <Link
                      className="hover:underline"
                      href={`/organizations/${member.organizationId}`}
                    >
                      {member.name}
                    </Link>
                    <Badge variant="secondary">{roleNames[member.role]}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("Copy.noOrganizationTeamMemberships")}{" "}
                </p>
              )}
            </DetailCard>
            {query.data.coach && (
              <DetailCard title={t("Copy.coachIntroduction")}>
                <p className="whitespace-pre-wrap text-sm leading-7">
                  {query.data.coach.biography ||
                    t("Copy.noIntroductionProvided")}
                </p>
              </DetailCard>
            )}
            <DetailCard title={t("Copy.latest25Sessions")}>
              <div className="grid gap-4">
                {query.data.sessions.map((session) => (
                  <div
                    key={session.id}
                    className="grid gap-2 border-b pb-4 text-sm last:border-0"
                  >
                    <p className="font-medium">
                      {clientNames[session.client] ?? session.client} ·{" "}
                      {session.device}
                    </p>
                    <p className="text-muted-foreground">
                      {t("Copy.created")} {dateLabel(session.createdAt)}{" "}
                      {t("Copy.expires")} {dateLabel(session.expiresAt)}
                      {session.revokedAt &&
                        t("Copy.sessionRevokedAt", {
                          date: dateLabel(session.revokedAt),
                        })}
                    </p>
                  </div>
                ))}
              </div>
            </DetailCard>
            <DetailCard title={t("Copy.actionsByThisUser")}>
              <AdminAuditContent actorId={id} />
            </DetailCard>
          </>
        )
      )}
      <DecisionDialog
        key={`${decision?.id}-${decision?.status}`}
        decision={decision}
        close={() => setDecision(null)}
        save={save}
        kind="user"
      />
    </>
  );
}
