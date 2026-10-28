"use client";

import {
  Calendar1Icon as CalendarDays,
  CreditCardIcon as CreditCard,
  BarbellHorizontalIcon as Dumbbell,
} from "@repo/ui/icons";
import { Button } from "@repo/ui/kit/Button";
import { FitnessNote } from "@repo/ui/kit/FitnessIllustration";
import { toast } from "@repo/ui/kit/Sileo";
import { useState } from "react";
import { BranchInformation } from "../discovery/branch-information";
import { CatalogState } from "../discovery/catalog-state";
import { ClubAvailability } from "../discovery/club-availability";
import { ClubGalleryPreview } from "../discovery/club-gallery-preview";
import { ClubList } from "../discovery/club-list";
import { ClubTariffs } from "../discovery/club-tariffs";
import { Empty, Price, Row, Section, Segments } from "../luma/common";
import { ReservationSummary } from "../luma/reservation-design";
import { demoBranch, demoClubs, demoTariffs } from "./section-fixtures";
import type { DemoExample } from "./types";

function UpcomingSection() {
  return (
    <Section title="رزرو بعدی" href="/bookings">
      <div className="luma-group p-4">
        <Row
          title="تمرین قدرتی گروهی"
          meta="باشگاه اطلس · ساعت ۱۰ تا ۱۰:۴۵"
          state="confirmed"
          date="2026-10-28T10:00:00+03:30"
        />
        <Button
          className="mt-3 w-full"
          onClick={() => toast.info("بلیط نمونهٔ جلسه")}
        >
          مشاهدهٔ بلیط نمونه
        </Button>
      </div>
    </Section>
  );
}

function MembershipSection() {
  return (
    <Section title="عضویت‌های فعال" href="/memberships">
      <div className="luma-group">
        <Row
          title="عضویت ماهانهٔ بدنسازی"
          meta="۸ جلسهٔ باقی‌مانده · اعتبار تا پایان آبان"
          state="active"
          icon={<CreditCard size={24} />}
        />
        <Row
          title="تمرین گروهی"
          meta="۴ جلسهٔ باقی‌مانده"
          state="active"
          icon={<Dumbbell size={24} />}
        />
      </div>
    </Section>
  );
}

function SegmentsSection() {
  const [value, setValue] = useState("upcoming");
  return (
    <Section title="جلسه‌های من">
      <Segments
        options={[
          { value: "upcoming", label: "پیش رو" },
          { value: "past", label: "گذشته" },
        ]}
        value={value}
        onChange={setValue}
      />
      <div className="luma-group mt-3">
        <Row
          title={
            value === "upcoming" ? "تمرین قدرتی فردا" : "تمرین هوازی دیروز"
          }
          meta="باشگاه اطلس · ۴۵ دقیقه"
          state={value === "upcoming" ? "confirmed" : "completed"}
          icon={<CalendarDays size={24} />}
        />
      </div>
    </Section>
  );
}

function CatalogStateSection() {
  const [state, setState] = useState("loading");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["loading", "بارگذاری"],
            ["missing", "پیدا نشد"],
            ["error", "خطا"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            variant={state === value ? "default" : "outline"}
            size="sm"
            aria-pressed={state === value}
            onClick={() => setState(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      <CatalogState
        loading={state === "loading"}
        missing={state === "missing"}
        retry={state === "loading" ? undefined : () => setState("loading")}
      />
    </div>
  );
}

export const sectionExamples: DemoExample[] = [
  {
    name: "Section / Row",
    title: "سکشن رزرو بعدی",
    keywords: "سکشن بخش ردیف رزرو بلیط",
    category: "sections",
    Preview: UpcomingSection,
  },
  {
    name: "Section / Memberships",
    title: "سکشن عضویت‌های فعال",
    keywords: "سکشن بخش عضویت ردیف وضعیت",
    category: "sections",
    Preview: MembershipSection,
  },
  {
    name: "Section / Segments",
    title: "سکشن جلسه‌ها با تب",
    keywords: "سکشن تب جلسه پیش رو گذشته",
    category: "sections",
    Preview: SegmentsSection,
  },
  {
    name: "Section / Empty",
    title: "سکشن با حالت خالی",
    keywords: "سکشن خالی تصویرسازی",
    category: "sections",
    Preview: () => (
      <Section title="جلسه‌های آینده">
        <Empty illustration="kettlebell">هنوز جلسه‌ای رزرو نکردی.</Empty>
      </Section>
    ),
  },
  {
    name: "ClubList",
    title: "سکشن فهرست باشگاه‌ها",
    keywords: "سکشن لیست باشگاه پیشنهاد",
    category: "sections",
    Preview: () => (
      <ClubList
        clubs={demoClubs.slice(0, 3)}
        title="باشگاه‌های پیشنهادی"
        viewLabel="مشاهدهٔ نمونه"
      />
    ),
  },
  {
    name: "ClubGalleryPreview",
    title: "سکشن گالری باشگاه",
    keywords: "سکشن تصاویر عکس گالری کاروسل",
    category: "sections",
    Preview: () => (
      <ClubGalleryPreview clubId="atlas" photos={demoClubs[0]!.photos} />
    ),
  },
  {
    name: "ClubAvailability",
    title: "سکشن ساعت کاری و اطلاعات شعبه",
    keywords: "سکشن برنامه ساعت کاری دسترسی شعبه",
    category: "sections",
    Preview: () => <ClubAvailability branch={demoBranch} />,
  },
  {
    name: "BranchInformation",
    title: "سکشن مشخصات و امکانات شعبه",
    keywords: "سکشن اطلاعات قوانین آدرس تجهیزات امکانات",
    category: "sections",
    Preview: () => <BranchInformation branch={demoBranch} />,
  },
  {
    name: "ClubTariffs",
    title: "سکشن تعرفه‌ها",
    keywords: "سکشن قیمت تعرفه عضویت جلسه",
    category: "sections",
    Preview: () => <ClubTariffs tariffs={demoTariffs} />,
  },
  {
    name: "ReservationSummary",
    title: "سکشن خلاصهٔ رزرو",
    keywords: "سکشن خلاصه رزرو پرداخت زمان هزینه",
    category: "sections",
    Preview: () => (
      <ReservationSummary
        title="تمرین قدرتی گروهی"
        venue="باشگاه اطلس · شعبهٔ مرکزی"
        startAt="2026-10-28T10:00:00+03:30"
        endAt="2026-10-28T10:45:00+03:30"
        amountMinor="4500000"
        state="confirmed"
      />
    ),
  },
  {
    name: "FitnessNote",
    title: "سکشن یادآوری با تصویرسازی",
    keywords: "سکشن بنر یادآوری اطلاع رسانی",
    category: "sections",
    Preview: () => (
      <FitnessNote
        title="برای تمرین بعدی آماده‌ای؟"
        description="آب کافی بنوش و وسایل تمرینت را همراه داشته باش."
        illustration="bottle"
        action={
          <Button onClick={() => toast.success("یادآوری نمونه تأیید شد")}>
            متوجه شدم
          </Button>
        }
      />
    ),
  },
  {
    name: "CatalogState",
    title: "سکشن بارگذاری، خطا و نتیجهٔ خالی",
    keywords: "سکشن وضعیت لودینگ خطا تلاش دوباره",
    category: "sections",
    Preview: CatalogStateSection,
  },
  {
    name: "Section / Price",
    title: "سکشن خلاصهٔ هزینه",
    keywords: "سکشن قیمت هزینه جمع مبلغ",
    category: "sections",
    Preview: () => (
      <Section title="خلاصهٔ هزینه">
        <div className="luma-group">
          <Row title="هزینهٔ یک جلسه" meta="تعرفهٔ نمایشی">
            <Price value="4500000" />
          </Row>
          <Row title="ارزیابی اولیه" meta="همراه عضویت">
            <Price value="0" />
          </Row>
        </div>
      </Section>
    ),
  },
];
