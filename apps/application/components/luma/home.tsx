"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  Bell,
  CalendarDays,
  CreditCard,
  Dumbbell,
  FileText,
  LifeBuoy,
  ListChecks,
  Receipt,
  Ticket,
} from "lucide-react";
import { useLocale, useTranslations } from "@repo/i18n";
import { useAccount } from "@repo/api/profile";
import { ServiceCoverThumbnail } from "@repo/ui/sports-cover";
import { PersonalAgenda } from "./agenda";
import { accountReadDenied } from "@repo/ui/lib/account-recovery";
import { Discovery } from "../discovery/discovery";
import {
  useSportsQuery,
  type ServiceDto,
  type CalendarPageDto,
} from "@repo/api/sports";
import {
  CreateAction,
  Empty,
  LumaPage,
  Price,
  QueryState,
  Row,
  Section,
  stamp,
  useLuma,
} from "./common";
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
  const locale = useLocale();
  const brand = useTranslations("Home");
  const calendars = useSportsQuery<CalendarPageDto>(
    "sports/community/calendars/page",
    { limit: 3 },
  );
  const services = useSportsQuery<ServiceDto[]>("sports/services");
  return (
    <LumaPage
      title={brand("brand")}
      actions={
        <>
          <CreateAction />
          <Link
            href="/notifications"
            className="luma-icon"
            aria-label={t("notifications")}
          >
            <Bell size={21} />
          </Link>
        </>
      }
    >
      <PersonalAgenda />
      <div className="luma-shortcuts">
        {(
          [
            { href: "/memberships", key: "memberships", Icon: CreditCard },
            { href: "/training", key: "training", Icon: Dumbbell },
            { href: "/saved", key: "saved", Icon: Bookmark },
            { href: "/orders", key: "orders", Icon: Receipt },
            { href: "/documents", key: "documents", Icon: FileText },
            { href: "/waitlist", key: "waitlist", Icon: ListChecks },
            { href: "/membership-card", key: "ticket", Icon: Ticket },
            {
              href: "/invitations/sports",
              key: "invitations",
              Icon: CalendarDays,
            },
            { href: "/support", key: "support", Icon: LifeBuoy },
          ] as const
        ).map(({ href, key, Icon }) => (
          <Link className="luma-shortcut" key={href} href={href}>
            <Icon size={21} />
            {t(key)}
          </Link>
        ))}
      </div>
      {(calendars.isPending ||
        calendars.error ||
        Boolean(calendars.data?.items.length)) &&
        calendars.error?.status !== 401 && (
          <Section title={t("yourCalendars")} href="/calendars?view=following">
            <QueryState query={calendars}>
              {calendars.data?.items.map((c) => (
                <Row
                  key={c.id}
                  title={c.title}
                  href={`/calendars/detail?id=${c.id}`}
                  meta={c.description}
                />
              ))}
              {!calendars.data?.items.length && (
                <Empty compact illustration="watch" />
              )}
            </QueryState>
          </Section>
        )}
      <Section title={t("picked")} href="/services">
        <QueryState query={services}>
          {services.data?.slice(0, 6).map((s) => (
            <Row
              key={s.id}
              title={s.title}
              icon={<ServiceCoverThumbnail cover={s.cover} />}
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
          {!services.data?.length && (
            <Empty compact illustration="kettlebell" />
          )}
        </QueryState>
      </Section>
    </LumaPage>
  );
}
