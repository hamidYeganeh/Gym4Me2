"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Building2,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Users,
  UserRound,
  Monitor,
  ScrollText,
  Mail,
  MapPin,
} from "lucide-react";
import { Button } from "@repo/ui/kit/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/kit/Card";
import { NativeSelect, NativeSelectOption } from "@repo/ui/kit/NativeSelect";
import { Field, FieldLabel } from "@repo/ui/kit/Field";
import {
  api,
  ApiError,
  type Account,
  type Client,
  type Organization,
} from "./api";
import {
  Blank,
  Loading,
  QueryError,
  Status,
  roleNames,
  useQuery,
} from "./common";
import { ProfileContent, SessionsContent, InvitationsContent } from "./profile";
import { BranchesContent, OrganizationsContent, TeamContent } from "./business";
import {
  AdminAuditContent,
  AdminOrganizationsContent,
  AdminUsersContent,
} from "./admin";
export type Section =
  | "overview"
  | "organizations"
  | "branches"
  | "team"
  | "profile"
  | "sessions"
  | "invitations"
  | "users"
  | "audit";
const commonNav = [
  { key: "profile", href: "/profile", title: "پروفایل من", icon: UserRound },
  { key: "sessions", href: "/sessions", title: "نشست‌های فعال", icon: Monitor },
  {
    key: "invitations",
    href: "/invitations",
    title: "دعوت‌های همکاری",
    icon: Mail,
  },
];
const businessNav = [
  { key: "overview", href: "/", title: "نمای کلی", icon: LayoutDashboard },
  {
    key: "organizations",
    href: "/organizations",
    title: "مجموعه‌های من",
    icon: Building2,
  },
  { key: "branches", href: "/branches", title: "شعبه‌ها", icon: MapPin },
  { key: "team", href: "/team", title: "اعضای تیم", icon: Users },
];
const adminNav = [
  { key: "overview", href: "/", title: "نمای کلی", icon: LayoutDashboard },
  { key: "users", href: "/users", title: "کاربران", icon: Users },
  {
    key: "organizations",
    href: "/organizations",
    title: "بررسی مجموعه‌ها",
    icon: Building2,
  },
  {
    key: "audit",
    href: "/audit",
    title: "رویدادهای مدیریتی",
    icon: ScrollText,
  },
];
export function AccountWorkspace({
  client,
  section,
}: {
  client: Client;
  section: Section;
}) {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [allowed, setAllowed] = useState(client !== "admin");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    (async () => {
      const user = await api<Account>(client, "profile/account");
      const access =
        client === "admin"
          ? await api<{ isAdmin: boolean }>(client, "profile/access")
          : { isAdmin: true };
      if (active) {
        setAccount(user);
        setAllowed(access.isAdmin);
        setError(null);
        setReady(true);
      }
    })().catch((err: unknown) => {
      if (!active) return;
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "ارتباط برقرار نشد.");
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [client, router, retry]);
  async function logout() {
    setBusy(true);
    setError(null);
    try {
      await api(client, "auth/sessions/logout", "POST");
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خروج انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  const nav = [
    ...(client === "business"
      ? businessNav
      : client === "admin"
        ? adminNav
        : []),
    ...commonNav,
  ];
  const title = nav.find((item) => item.key === section)?.title ?? "حساب من";
  return (
    <div dir="rtl" className="min-h-dvh bg-muted/25 lg:flex">
      {client !== "application" && (
        <aside className="flex flex-col border-b bg-background p-5 lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-e">
          <Link
            href="/"
            className="mb-8 flex items-center gap-2 text-xl font-semibold"
          >
            <Dumbbell className="size-7 text-primary" />
            <span dir="ltr">
              Gym4Me{" "}
              <span className="text-xs text-muted-foreground">
                {client === "business" ? "BUSINESS" : "ADMIN"}
              </span>
            </span>
          </Link>
          <p className="mb-3 px-3 text-xs text-muted-foreground">
            {client === "business" ? "فضای کاری باشگاه" : "مدیریت پلتفرم"}
          </p>
          <nav
            aria-label="منوی پنل"
            className="flex gap-1 overflow-x-auto lg:flex-col"
          >
            {nav.map((item) => (
              <Button
                key={item.key}
                variant={section === item.key ? "secondary" : "ghost"}
                className="justify-start"
                asChild
              >
                <Link
                  href={item.href}
                  aria-current={section === item.key ? "page" : undefined}
                >
                  <item.icon data-icon="inline-start" />
                  {item.title}
                </Link>
              </Button>
            ))}
          </nav>
          <div className="mt-auto hidden pt-8 text-xs leading-6 text-muted-foreground lg:block">
            <ShieldCheck className="mb-2 size-5" />
            دسترسی هر نفر متناسب با نقش اوست.
          </div>
        </aside>
      )}
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-4 border-b bg-background px-5 py-4 lg:px-10">
          <div>
            <p className="text-sm text-muted-foreground">
              {client === "application"
                ? "حساب مشترک مربی و ورزشکار"
                : "جیم‌فورمی / " + title}
            </p>
            <h1 className="mt-1 text-xl font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm sm:inline">
              {account?.displayName ?? account?.phone}
            </span>
            {account && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void logout()}
                disabled={busy}
              >
                <LogOut data-icon="inline-start" />
                خروج
              </Button>
            )}
          </div>
        </header>
        {client === "application" && (
          <nav
            aria-label="حساب من"
            className="flex gap-2 overflow-auto border-b bg-background p-3"
          >
            {commonNav.map((item) => (
              <Button
                key={item.key}
                variant={section === item.key ? "secondary" : "ghost"}
                asChild
              >
                <Link href={item.href}>{item.title}</Link>
              </Button>
            ))}
            <Button variant="ghost" asChild>
              <Link href="/discovery">کشف باشگاه</Link>
            </Button>
          </nav>
        )}
        <main className="mx-auto grid max-w-6xl gap-7 p-5 lg:p-10">
          <QueryError error={error} retry={() => setRetry((n) => n + 1)} />
          {!ready ? (
            <Loading />
          ) : account ? (
            !allowed ? (
              <Blank
                title="دسترسی ادمین برای این حساب فعال نیست"
                description="با حساب دارای دسترسی مدیریت وارد شوید یا از مسئول پلتفرم بخواهید دسترسی شما را بررسی کند."
              />
            ) : (
              <WorkspaceContent
                client={client}
                section={section}
                account={account}
                setAccount={setAccount}
              />
            )
          ) : null}
        </main>
      </div>
    </div>
  );
}
function WorkspaceContent({
  client,
  section,
  account,
  setAccount,
}: {
  client: Client;
  section: Section;
  account: Account;
  setAccount: (account: Account) => void;
}) {
  if (section === "profile")
    return (
      <ProfileContent client={client} account={account} onSave={setAccount} />
    );
  if (section === "sessions") return <SessionsContent client={client} />;
  if (section === "invitations") return <InvitationsContent client={client} />;
  if (client === "admin") {
    if (section === "users") return <AdminUsersContent />;
    if (section === "organizations") return <AdminOrganizationsContent />;
    if (section === "audit") return <AdminAuditContent />;
    return <AdminOverview />;
  }
  if (section === "organizations") return <OrganizationsContent />;
  if (section === "branches" || section === "team")
    return <OrganizationScope section={section} />;
  return <BusinessOverview name={account.displayName} />;
}
function OrganizationScope({ section }: { section: "branches" | "team" }) {
  const query = useQuery<Organization[]>("business", "business/organizations");
  const [selected, setSelected] = useState("");
  const org = query.data?.find((o) => o.id === selected) ?? query.data?.[0];
  if (query.loading) return <Loading />;
  if (query.error)
    return <QueryError error={query.error} retry={query.reload} />;
  if (!org)
    return (
      <Blank
        title="هنوز مجموعه‌ای نداری"
        description="از بخش مجموعه‌های من، اولین مجموعه را ثبت کن یا دعوت همکاری‌ات را بپذیر."
      />
    );
  return (
    <>
      <Field className="max-w-sm">
        <FieldLabel htmlFor="organization">مجموعه فعال</FieldLabel>
        <NativeSelect
          id="organization"
          value={org.id}
          onChange={(e) => setSelected(e.target.value)}
        >
          {query.data?.map((item) => (
            <NativeSelectOption key={item.id} value={item.id}>
              {item.name} · {roleNames[item.role]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      {section === "branches" ? (
        <BranchesContent key={org.id} organization={org} />
      ) : (
        <TeamContent key={org.id} organization={org} />
      )}
    </>
  );
}
export function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm font-normal text-muted-foreground">
          {label}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-semibold tabular-nums">
          {value.toLocaleString("fa-IR")}
        </p>
      </CardContent>
    </Card>
  );
}
function BusinessOverview({ name }: { name: string | null }) {
  const query = useQuery<Organization[]>("business", "business/organizations");
  return (
    <>
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">
            {name ? `${name}، خوش اومدی` : "به فضای کاری‌ات خوش اومدی"}
          </h2>
          <p className="mt-2 text-muted-foreground">
            مجموعه‌ها و دسترسی‌های تیمت را از اینجا مدیریت کن.
          </p>
        </div>
        <Button asChild>
          <Link href="/organizations">ثبت مجموعه</Link>
        </Button>
      </section>
      <QueryError error={query.error} retry={query.reload} />
      {query.loading ? (
        <Loading />
      ) : (
        query.data && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric
                label="مجموعه‌های من"
                value={query.data.length}
                icon={<Building2 className="size-5 text-muted-foreground" />}
              />
              <Metric
                label="مجموعه‌های تأییدشده"
                value={query.data.filter((o) => o.status === "approved").length}
                icon={<ShieldCheck className="size-5 text-muted-foreground" />}
              />
              <Metric
                label="در انتظار بررسی"
                value={query.data.filter((o) => o.status === "pending").length}
                icon={<ScrollText className="size-5 text-muted-foreground" />}
              />
            </div>
            {!query.data.length ? (
              <Blank
                title="اولین مجموعه‌ات را ثبت کن"
                description="نام مجموعه را وارد کن، شعبه بساز و همکارانت را دعوت کن. وضعیت بررسی مجموعه همین‌جا نمایش داده می‌شود."
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>مجموعه‌های شما</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {query.data.map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between gap-3 border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium">{o.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {roleNames[o.role]}
                        </p>
                      </div>
                      <Status value={o.status} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )
      )}
    </>
  );
}
function AdminOverview() {
  const query = useQuery<{
    users: number;
    organizations: number;
    pending: number;
  }>("admin", "admin/overview");
  return (
    <>
      <h2 className="text-2xl font-semibold">وضعیت پلتفرم</h2>
      <QueryError error={query.error} retry={query.reload} />
      {query.loading ? (
        <Loading />
      ) : (
        query.data && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric
              label="کاربران"
              value={query.data.users}
              icon={<Users className="size-5 text-muted-foreground" />}
            />
            <Metric
              label="مجموعه‌ها"
              value={query.data.organizations}
              icon={<Building2 className="size-5 text-muted-foreground" />}
            />
            <Metric
              label="نیازمند بررسی"
              value={query.data.pending}
              icon={<ScrollText className="size-5 text-muted-foreground" />}
            />
          </div>
        )
      )}
      <Card>
        <CardHeader>
          <CardTitle>صف بررسی مجموعه‌ها</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            مجموعه‌های ثبت‌شده را بررسی کن و نتیجه را همراه دلیل ثبت کن.
          </p>
          <Button asChild>
            <Link href="/organizations">بررسی مجموعه‌ها</Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
