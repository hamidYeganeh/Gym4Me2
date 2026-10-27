"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Compass,
  CreditCard,
  CalendarDays,
  MoreHorizontal,
} from "lucide-react";
import { useLocale, useTranslations } from "@repo/i18n";
import { useAccount } from "@repo/api/profile";
import { accountReadDenied } from "@repo/ui/lib/account-recovery";
import { Discovery } from "../discovery/discovery";
import {
  useSportsQuery,
  type BookingPageDto,
  type MembershipDto,
} from "@repo/api/sports";
import { LumaPage, QueryState, Row, Section, stamp, useLuma } from "./common";
import { membershipAccess } from "../../lib/membership-access";
import { useAppClock } from "./use-app-clock";
export function HomePage() {
  const account = useAccount();
  if (account.data && !accountReadDenied(account.error))
    return <SignedInHome />;
  return <GuestHome settled={account.error?.status === 401} />;
}
function GuestHome({ settled }: { settled: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (settled && window.location.pathname === "/")
      router.replace("/discovery");
  }, [settled, router]);
  // Public content is available even while the initial session check is pending.
  return <Discovery />;
}
function SignedInHome() {
  const t = useLuma();
  const simple = useTranslations("SimpleApp");
  const locale = useLocale();
  const now = useAppClock();
  const bookings = useSportsQuery<BookingPageDto>(
    "sports/account/bookings/page",
    { tab: "upcoming", limit: 1 },
  );
  const memberships = useSportsQuery<MembershipDto[]>(
    "sports/account/memberships",
  );
  const active = memberships.data?.filter(
    (m) => membershipAccess(m, now) === "active",
  );
  return (
    <LumaPage
      title={simple("homeTitle")}
      actions={
        <Link
          href="/notifications"
          className="luma-icon"
          aria-label={t("notifications")}
        >
          <Bell size={21} />
        </Link>
      }
    >
      <p className="luma-meta mb-5">{simple("homeHint")}</p>
      <Link className="luma-cta gap-2" href="/discovery">
        <Compass size={20} />
        {simple("findGym")}
      </Link>
      <Section title={simple("nextBooking")} href="/bookings">
        <QueryState query={bookings}>
          {bookings.data?.items.map((booking) => (
            <article className="luma-group p-4" key={booking.id}>
              <Row
                title={booking.title}
                meta={`${booking.branchName} · ${stamp(booking.startAt, locale)}`}
                state={booking.status}
                href={`/bookings/detail?id=${booking.id}`}
              />
              {booking.status === "confirmed" && (
                <Link
                  className="luma-cta"
                  href={`/tickets/view?id=${booking.id}`}
                >
                  {simple("entryTicket")}
                </Link>
              )}
            </article>
          ))}
          {!bookings.data?.items.length && (
            <p className="luma-meta py-4">{simple("noUpcomingBooking")}</p>
          )}
        </QueryState>
      </Section>
      <Section title={simple("activeMemberships")} href="/memberships">
        <QueryState query={memberships}>
          {active?.slice(0, 2).map((m) => (
            <article key={m.id} className="luma-group p-4 mb-3">
              <Row
                title={
                  m.dependentName ? `${m.dependentName} · ${m.title}` : m.title
                }
                href={`/memberships/detail?id=${m.id}`}
                meta={
                  m.endsAt
                    ? `${simple("validUntil")} ${stamp(m.endsAt, locale)}`
                    : simple("noExpiry")
                }
              >
                <span className="luma-meta">
                  {simple("sessionsLeft", {
                    count:
                      m.granted === null
                        ? "∞"
                        : new Intl.NumberFormat(locale).format(
                            Math.max(0, m.granted - m.consumed - m.held),
                          ),
                  })}
                </span>
              </Row>
              <Link
                className="luma-cta bg-muted text-foreground"
                href={`/tickets/view?id=${m.id}&membership=true`}
              >
                {simple("entryTicket")}
              </Link>
            </article>
          ))}
          {!active?.length && (
            <p className="luma-meta py-4">{simple("noActiveMembership")}</p>
          )}
        </QueryState>
      </Section>
      <div className="luma-shortcuts">
        <Link className="luma-shortcut" href="/bookings">
          <CalendarDays size={21} />
          {simple("bookings")}
        </Link>
        <Link className="luma-shortcut" href="/memberships">
          <CreditCard size={21} />
          {simple("memberships")}
        </Link>
        <Link className="luma-shortcut" href="/more">
          <MoreHorizontal size={21} />
          {simple("more")}
        </Link>
      </div>
    </LumaPage>
  );
}
