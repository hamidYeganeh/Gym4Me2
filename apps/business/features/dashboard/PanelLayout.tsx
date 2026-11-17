"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { ReactNode } from "react";

import { ArrowSignOut1 } from "@repo/icons/arrow-sign-out-1";
import { Building2 } from "@repo/icons/building-2";
import { Calendar2 } from "@repo/icons/calendar-2";
import { House1 } from "@repo/icons/house-1";
import { Plus } from "@repo/icons/plus";
import { User } from "@repo/icons/user";

import { PageTransition } from "../../lib/PageTransition";
import styles from "./dashboard.module.css";

export const PanelLayout = (props: { panel: "admin" | "business"; children: ReactNode }) => {
  const { panel, children } = props;
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

  async function signOut() {
    setSigningOut(true);
    setSignOutError(false);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign-out failed.");
      window.location.replace("/auth");
    } catch {
      setSignOutError(true);
      setSigningOut(false);
    }
  }
  const navigation = [
    { href: "/", label: "Dashboard", icon: House1, active: pathname === "/" },
    {
      href: "/clubs",
      label: panel === "admin" ? "Club requests" : "Clubs",
      icon: Building2,
      active:
        pathname === "/clubs" ||
        pathname === "/club" ||
        (pathname.startsWith("/club/") && pathname !== "/club/new"),
    },
    {
      href: "/classes",
      label: "Classes & reservations",
      icon: Calendar2,
      active: pathname.startsWith("/classes") || pathname.startsWith("/reservations"),
    },
    ...(panel === "business" ?
      [{ href: "/club/new", label: "Request a club", icon: Plus, active: pathname === "/club/new" }]
    : []),
    {
      href: "/users",
      label: "Users",
      icon: User,
      active: pathname === "/users" || pathname.startsWith("/users/"),
    },
  ];
  return (
    <div className={styles.shell}>
      <a href="#panel-content" className={styles.skip}>
        Skip to content
      </a>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand} aria-label={`Gym4Me ${panel} home`}>
          <Image src="/gym4me-logo.png" alt="" width={40} height={40} unoptimized />
        </Link>
        <nav aria-label="Main navigation" className={styles.navigation}>
          {navigation.map(({ href, label, icon: Icon, active }) => (
            <Link
              key={href}
              href={href}
              aria-label={label}
              title={label}
              aria-current={active ? "page" : undefined}
              className={href === "/club/new" ? styles.create : undefined}
            >
              <Icon size={26} />
            </Link>
          ))}
          <button
            type="button"
            aria-label="Sign out"
            title="Sign out"
            className="grid h-[52px] w-[44px] shrink-0 place-items-center"
            disabled={signingOut}
            onClick={() => void signOut()}
          >
            <ArrowSignOut1 size={24} />
          </button>
        </nav>
        <span className={styles.panelLabel}>{panel === "admin" ? "Admin" : "Business"}</span>
      </aside>
      {signOutError && (
        <p role="alert" className="fixed end-4 top-4 z-30 rounded-lg bg-neutral-800 p-3 text-white">
          Could not sign out. Try again.
        </p>
      )}
      <PageTransition
        effect={
          pathname === "/club" || pathname === "/clubs" || pathname.startsWith("/club/") ?
            "slide"
          : "fade"
        }
        id="panel-content"
        className={styles.content}
        tabIndex={-1}
      >
        {children}
      </PageTransition>
      {panel === "business" && pathname === "/" && (
        <Link
          href="/club/new"
          className={styles.floatingCreate}
          aria-label="Request a club"
          title="Request a club"
        >
          <Plus size={32} />
        </Link>
      )}
    </div>
  );
};
