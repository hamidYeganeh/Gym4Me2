"use client";
import {
  Calendar1Icon as CalendarDays,
  ChevronLeftIcon as ChevronLeft,
} from "@repo/ui/icons";
import Link from "next/link";
import { useLuma } from "./common";
export function ServicesLink() {
  const t = useLuma();
  return (
    <div className="px-5 pb-24">
      <Link className="luma-shortcut" href="/services">
        <CalendarDays size={22} />
        <span className="flex-1">{t("services")}</span>
        <ChevronLeft className="ltr:rotate-180" />
      </Link>
    </div>
  );
}
