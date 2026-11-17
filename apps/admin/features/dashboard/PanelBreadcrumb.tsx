"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLocale } from "@repo/i18n";

const pages = {
  "/clubs": ["درخواست‌های باشگاه", "Club requests"],
  "/club/publications": ["بررسی انتشار", "Publication review"],
  "/coach-requests": ["درخواست‌های مربیان", "Coach requests"],
  "/club/resources": ["مدیریت منابع", "Resources"],
  "/classes": ["کلاس‌ها و رزروها", "Classes & reservations"],
  "/classes/new": ["ایجاد کلاس", "Create class"],
  "/reservations/new": ["ثبت رزرو", "Create reservation"],
  "/users": ["کاربران", "Users"],
} as const;

type Page = keyof typeof pages;

export const PanelBreadcrumb = ({ title }: { title?: string } = {}) => {
  const pathname = usePathname();
  const fa = useLocale() === "fa";
  if (pathname === "/") return null;

  let current: string | undefined = pages[pathname as Page]?.[fa ? 0 : 1];
  let parent: Page | undefined;
  if (pathname.startsWith("/club/resources/")) {
    if (!title) return null;
    parent = "/club/resources";
    current = title;
  } else if (pathname === "/classes/new" || pathname === "/reservations/new") {
    parent = "/classes";
  } else if (pathname.startsWith("/users/")) {
    parent = "/users";
    current = fa ? "پروفایل کاربر" : "User profile";
  } else if (pathname === "/club/publications" || pathname === "/coach-requests") {
    parent = "/clubs";
  } else if (!current && (pathname === "/club" || pathname.startsWith("/club/"))) {
    current = pages["/clubs"][fa ? 0 : 1];
  }

  return (
    <nav
      aria-label={fa ? "مسیر صفحه" : "Breadcrumb"}
      className="mx-auto max-w-screen-2xl px-4 pt-5 text-sm text-theme-muted-foreground sm:px-8"
    >
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/" className="hover:underline">
            {fa ? "داشبورد" : "Dashboard"}
          </Link>
        </li>
        {parent && (
          <li className="flex items-center gap-2">
            <span aria-hidden>/</span>
            <Link href={parent} className="hover:underline">
              {pages[parent][fa ? 0 : 1]}
            </Link>
          </li>
        )}
        {current && (
          <li className="flex items-center gap-2" aria-current="page">
            <span aria-hidden>/</span>
            <span className="text-theme-foreground">{current}</span>
          </li>
        )}
      </ol>
    </nav>
  );
};
