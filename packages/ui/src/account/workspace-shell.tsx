"use client";
import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "@repo/i18n";
import { Logo } from "@repo/theme/logo";
import { useAccount } from "@repo/api/profile";
import { useLogout } from "@repo/api/auth";
import { LogOut, Menu, UserRound } from "lucide-react";
import { BottomSheet } from "../kit/BottomSheet";
import { Button } from "../kit/Button";
import { accountReadDenied } from "../lib/account-recovery";
import { ErrorNotice } from "./common";
import {
  workspaceNavigation,
  isWorkspaceRouteActive,
  type NavigationGroup,
} from "./workspace-navigation";
import "./workspace-shell.css";

const groups: NavigationGroup[] = ["work", "management", "finance", "account"];
const publicRoutes = new Set([
  "/login",
  "/reset-password",
  "/set-password",
  "/privacy",
]);
type Surface = "business" | "admin";

/** Persistent navigation: stays outside route transitions and never grants access. */
export function WorkspaceShell({
  client,
  children,
  currentPath,
}: {
  client: Surface;
  children: ReactNode;
  currentPath?: string;
}) {
  const pathname = usePathname();
  const path = currentPath ?? pathname;
  if (publicRoutes.has(path)) return children;
  return (
    <WorkspaceChrome key={client} client={client} path={path}>
      {children}
    </WorkspaceChrome>
  );
}
function WorkspaceChrome({
  client,
  path,
  children,
}: {
  client: Surface;
  path: string;
  children: ReactNode;
}) {
  const t = useTranslations(),
    nav = workspaceNavigation(client),
    query = useAccount(),
    logout = useLogout(),
    router = useRouter();
  const account = accountReadDenied(query.error) ? undefined : query.data;
  const conversation = path.startsWith("/messages/");
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const mobileMenu = useRef<HTMLElement>(null);
  async function signOut() {
    try {
      await logout.mutateAsync();
      router.replace("/login");
    } catch {
      /* The shared notice exposes the mutation error without losing the page. */
    }
  }
  function navigation(mobile = false) {
    return (
      <nav
        ref={mobile ? mobileMenu : undefined}
        aria-label={t("Copy.panelNavigation")}
        className="workspace-menu"
      >
        {groups.map((group) => (
          <section key={group} aria-label={t(`WorkspaceNav.${group}`)}>
            <h2>{t(`WorkspaceNav.${group}`)}</h2>
            <div>
              {nav
                .filter((item) => item.group === group)
                .map((item) => {
                  const active = isWorkspaceRouteActive(path, item.href);
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      prefetch={false}
                      aria-current={active ? "page" : undefined}
                      onClick={() => {
                        if (mobile) setOpen(false);
                      }}
                    >
                      <item.icon size={19} aria-hidden="true" />
                      <span>{t(item.title)}</span>
                      {active && (
                        <span
                          className="workspace-menu-dot"
                          aria-hidden="true"
                        />
                      )}
                    </Link>
                  );
                })}
            </div>
          </section>
        ))}
      </nav>
    );
  }
  const brand = (
    <Link href="/" prefetch={false} className="workspace-brand">
      <Logo size={32} className="shrink-0 text-[var(--brand)]" />
      <span>
        <strong dir="ltr">{t("Copy.brand")}</strong>
        <small>
          {t(client === "business" ? "Copy.businessBrand" : "Copy.adminBrand")}
        </small>
      </span>
    </Link>
  );
  const dockKeys =
    client === "business"
      ? ["overview", "sports-calendar", "sports-messages"]
      : ["overview", "analytics", "users"];
  const identity = (
    <div className="workspace-identity">
      <Link
        href="/profile"
        prefetch={false}
        onClick={() => setOpen(false)}
        className="workspace-person"
      >
        <span className="workspace-avatar">
          <UserRound size={19} />
        </span>
        <span>
          <strong>{account?.displayName || t("Copy.myProfile")}</strong>
          <small>
            {account?.phone ? (
              <bdi dir="ltr">{account.phone}</bdi>
            ) : (
              t("WorkspaceNav.workspace")
            )}
          </small>
        </span>
      </Link>
      {account && (
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          onClick={() => void signOut()}
          disabled={logout.isPending}
          aria-label={t("Copy.signOut")}
        >
          <LogOut size={18} />
        </Button>
      )}
    </div>
  );
  return (
    <div
      className="workspace-shell"
      data-workspace={client}
      data-conversation={conversation || undefined}
    >
      <aside className="workspace-sidebar">
        {brand}
        {navigation()}
        <footer>
          {identity}
          <ErrorNotice error={logout.error} />
        </footer>
      </aside>
      <div className="workspace-body">
        {!conversation && (
          <header className="workspace-mobile-bar">
            {brand}
            <Button
              ref={trigger}
              variant="outline"
              size="icon-lg"
              className="size-11"
              aria-label={t("WorkspaceNav.openMenu")}
              aria-haspopup="dialog"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </Button>
          </header>
        )}
        {children}
        {!conversation && (
          <nav
            className="workspace-dock"
            aria-label={t("Copy.panelNavigation")}
          >
            {nav
              .filter((item) => dockKeys.includes(item.key))
              .map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  prefetch={false}
                  aria-current={
                    isWorkspaceRouteActive(path, item.href) ? "page" : undefined
                  }
                >
                  <item.icon size={21} />
                  <span>{t(item.title)}</span>
                </Link>
              ))}
          </nav>
        )}
      </div>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={t("WorkspaceNav.navigation")}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          requestAnimationFrame(() =>
            mobileMenu.current?.querySelector<HTMLAnchorElement>("a")?.focus(),
          );
        }}
        description={t("WorkspaceNav.menuHint")}
        footer={
          <>
            {identity}
            <ErrorNotice error={logout.error} />
          </>
        }
      >
        {navigation(true)}
      </BottomSheet>
    </div>
  );
}
