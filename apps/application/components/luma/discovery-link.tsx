"use client";
import Link from "next/link";
import { CalendarDays, ChevronLeft } from "lucide-react";
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
      <Link className="luma-shortcut mt-3" href="/calendars">
        {t("calendars")}
      </Link>
    </div>
  );
}
