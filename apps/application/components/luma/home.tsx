"use client";
import Link from "next/link";
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
import { AuthWelcome } from "@repo/ui/account";
import { Skeleton } from "@repo/ui/kit/Skeleton";
import { useAuthRecovery } from "@repo/ui/hooks/use-auth-recovery";
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
  const t = useLuma();
  const recovery = useAuthRecovery(account, "/");
  if (recovery?.kind === "signIn")
    return (
      <LumaPage title={t("home")} className="luma-guest-home">
        <AuthWelcome />
      </LumaPage>
    );
  if (account.isPending)
    return (
      <LumaPage title={t("home")}>
        <div
          role="status"
          aria-label={t("loading")}
          className="flex flex-col items-center gap-6 py-24"
        >
          <Skeleton className="h-64 w-4/5 rounded-4xl" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-12 w-3/4 rounded-full" />
        </div>
      </LumaPage>
    );
  if (account.error)
    return (
      <LumaPage title={t("home")}>
        <QueryState query={account}>{null}</QueryState>
      </LumaPage>
    );
  return <SignedInHome />;
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
