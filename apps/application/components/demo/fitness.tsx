"use client";
import { SportCard } from "@repo/ui/kit/SportCard";
import { ExclamationMarkTriangleIcon } from "@repo/ui/icons";
import { ClubFaq } from "@repo/ui/kit/ClubFaq";
import { WorkoutTimer } from "@repo/ui/training";
import { ImageCompare } from "@repo/ui/kit/ImageCompare";

import { BarbellHorizontalIcon as Dumbbell } from "@repo/ui/icons";
import { Button } from "@repo/ui/kit/Button";
import { ChoiceOptionCard } from "@repo/ui/kit/ChoiceOptionCard";
import { ClassCard } from "@repo/ui/kit/ClassCard";
import { ClubBranchCard } from "@repo/ui/kit/ClubBranchCard";
import { ClubCard } from "@repo/ui/kit/ClubCard";
import { ClubDetail } from "@repo/ui/kit/ClubDetail";
import { ClubFeaturedCard } from "@repo/ui/kit/ClubFeaturedCard";
import { CoachCard } from "@repo/ui/kit/CoachCard";
import { CoachDetail } from "@repo/ui/kit/CoachDetail";
import { EquipmentCard } from "@repo/ui/kit/EquipmentCard";
import { FitnessIllustration } from "@repo/ui/kit/FitnessIllustration";
import { LocationCard } from "@repo/ui/kit/LocationCard";
import { LocationExplorer } from "@repo/ui/kit/LocationExplorer";
import { ReviewCard } from "@repo/ui/kit/ReviewCard";
import { ReviewsSummary } from "@repo/ui/kit/ReviewsSummary";
import { toast } from "@repo/ui/kit/Sileo";
import { useState } from "react";
import { getClubs } from "../../lib/clubs";
import { getCoaches } from "../../lib/coaches";
import { ClubShowcase } from "../discovery/club-showcase";
import type { DemoExample } from "./types";

const club = {
  ...getClubs("fa")[0]!,
  href: "/demo?category=fitness#demo-ClubDetail",
};
const coach = getCoaches("fa", club.id)[0]!;
const saveLabels = { save: "ذخیره", unsave: "حذف از ذخیره‌ها" };
const coachLabels = {
  ...saveLabels,
  new: "جدید",
  certified: "مربی رسمی",
  experience: "سال تجربه",
  rating: "امتیاز",
};

function ClubExample() {
  const [saved, setSaved] = useState(false);
  return (
    <ClubCard
      club={club}
      saved={saved}
      onSavedChange={setSaved}
      labels={{ ...saveLabels, discover: "مشاهده باشگاه" }}
    />
  );
}

function ClubDetailExample() {
  const [saved, setSaved] = useState(false);
  return (
    <div className="relative isolate h-120 overflow-y-auto rounded-2xl [transform:translateZ(0)]">
      <ClubDetail
        club={club}
        saved={saved}
        onSavedChange={setSaved}
        onShare={() => toast.info("اشتراک‌گذاری نمونه")}
        onPlanVisit={() => toast.info("برنامهٔ بازدید نمونه")}
        labels={{
          ...saveLabels,
          back: "بازگشت",
          share: "اشتراک",
          photo: "تصویر",
          about: "دربارهٔ باشگاه",
          amenities: "امکانات",
          hours: "ساعت کاری",
          distance: "فاصله",
          distanceUnavailable: "فاصله در دسترس نیست",
          coachCount: "مربی",
          reviews: "نظر",
          visit: "بازدید نمونه",
          perVisit: "هر جلسه",
          gallery: "گالری",
          seeMore: "بیشتر",
          seeLess: "کمتر",
        }}
      />
    </div>
  );
}

function CoachExample() {
  const [saved, setSaved] = useState(false);
  const [compact, setCompact] = useState(false);
  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        aria-pressed={compact}
        onClick={() => setCompact(!compact)}
      >
        {compact ? "نمایش کامل" : "نمایش فشرده"}
      </Button>
      <CoachCard
        coach={coach}
        locale="fa"
        labels={coachLabels}
        saved={saved}
        onSavedChange={setSaved}
        compact={compact}
      />
    </div>
  );
}

function CoachDetailExample() {
  const [saved, setSaved] = useState(false);
  return (
    <div className="relative isolate h-120 overflow-y-auto rounded-2xl [transform:translateZ(0)]">
      <CoachDetail
        coach={{
          ...coach,
          clubId: club.id,
          clubName: club.name,
          location: "تهران",
          description: "مربی نمونه با تمرکز بر تمرین قدرتی و آمادگی جسمانی.",
          photos: club.photos,
        }}
        locale="fa"
        saved={saved}
        onSavedChange={setSaved}
        labels={{
          ...coachLabels,
          back: "بازگشت",
          gallery: "گالری",
          photo: "تصویر",
          about: "دربارهٔ مربی",
          club: "باشگاه",
        }}
      />
    </div>
  );
}

function ClassExample() {
  const [saved, setSaved] = useState(false);
  const [compact, setCompact] = useState(false);
  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        aria-pressed={compact}
        onClick={() => setCompact(!compact)}
      >
        {compact ? "نمایش کامل" : "نمایش فشرده"}
      </Button>
      <ClassCard
        classItem={{
          id: "demo-class",
          title: "تمرین قدرتی گروهی",
          level: "متوسط",
          coachName: coach.name,
          minutes: 45,
          calories: 320,
          score: 4.8,
          photo: club.photos[0],
        }}
        locale="fa"
        labels={{
          ...saveLabels,
          calories: "کالری",
          minutes: "دقیقه",
          score: "امتیاز",
        }}
        saved={saved}
        onSavedChange={setSaved}
        compact={compact}
      />
    </div>
  );
}

const demoReactions = [{ emoji: "🚀", count: 3, mine: false }, { emoji: "🔥", count: 2, mine: false }];
function ReviewExample() {
  return (
    <ReviewCard
      review={{
        id: "demo-review",
        title: "فضای خوب برای تمرین",
        body: "تجهیزات کامل و محیط مرتب؛ این یک نظر نمایشی است.",
        date: "۱۴۰۵/۰۸/۰۶",
        rating: 5,
        verified: true,
        author: { displayName: "کاربر نمونه" },
      }}
      locale="fa"
      reactions={demoReactions}
      onReport={() => toast.info("گزارش نمونه")}
      labels={{
        verified: "بازدید تأییدشده",
        like: "مفید بود",
        dislike: "مفید نبود",
        report: "گزارش",
        more: "بیشتر",
        rating: "امتیاز",
      }}
    />
  );
}

function LocationExample() {
  return (
    <LocationCard
      name="تهران"
      parent="استان تهران"
      cover={club.photos[0]}
      clubCount={24}
      kindLabel="شهر"
      href="/discovery"
    />
  );
}

function ChoiceExample() {
  const [checked, setChecked] = useState(true);
  return (
    <ChoiceOptionCard
      control="switch"
      label="یادآوری تمرین"
      description="یک ساعت قبل از جلسه"
      checked={checked}
      onCheckedChange={setChecked}
      icon={<Dumbbell />}
    />
  );
}

export const fitnessExamples: DemoExample[] = [
  {
    name: "ClubCard",
    title: "کارت باشگاه",
    keywords: "کارت باشگاه ذخیره",
    category: "cards",
    Preview: ClubExample,
  },
  {
    name: "ClubDetail",
    keywords: "جزئیات باشگاه",
    category: "fitness",
    Preview: ClubDetailExample,
  },
  {
    name: "ClubFeaturedCard",
    title: "کارت باشگاه ویژه",
    keywords: "کارت باشگاه ویژه",
    category: "cards",
    Preview: () => <ClubFeaturedCard club={club} viewLabel="مشاهدهٔ باشگاه" />,
  },
  {
    name: "ClubBranchCard",
    title: "کارت شعبه",
    keywords: "شعبه باشگاه",
    category: "cards",
    Preview: () => (
      <ClubBranchCard
        branch={{
          id: "demo-branch",
          name: "شعبهٔ مرکزی",
          address: "تهران، زعفرانیه",
          photo: club.photos[0],
        }}
        viewLabel="نمایش روی نقشه"
      />
    ),
  },
  {
    name: "CoachCard",
    title: "کارت مربی",
    keywords: "مربی کارت",
    category: "cards",
    Preview: CoachExample,
  },
  {
    name: "CoachDetail",
    keywords: "جزئیات مربی",
    category: "fitness",
    Preview: CoachDetailExample,
  },
  {
    name: "ClassCard",
    title: "کارت کلاس",
    keywords: "کلاس تمرین",
    category: "cards",
    Preview: ClassExample,
  },
  {
    name: "EquipmentCard",
    title: "کارت تجهیزات",
    keywords: "تجهیزات امکانات",
    category: "cards",
    Preview: () => (
      <EquipmentCard
        label="وزنهٔ آزاد"
        description="دمبل و هالتر برای همهٔ سطوح"
        icon={<Dumbbell />}
      />
    ),
  },
  {
    name: "ChoiceOptionCard",
    title: "کارت انتخاب گزینه",
    keywords: "انتخاب گزینه کارت",
    category: "cards",
    Preview: ChoiceExample,
  },
  {
    name: "SportCard",
    title: "کارت ورزش",
    keywords: "sport card ورزش کارت",
    category: "cards",
    Preview: () => <div dir="ltr"><SportCard name="Live Chat" description="25 currently chatting" icon={ExclamationMarkTriangleIcon} href="/messages" className="w-full max-w-[342px]" /></div>,
  },
  {
    name: "ClubFaq",
    title: "پرسش‌های متداول باشگاه",
    keywords: "faq سوال پاسخ باشگاه",
    category: "fitness",
    Preview: () => <ClubFaq items={[{ question: "برای جلسهٔ اول چه وسایلی همراه داشته باشم؟", answer: "لباس ورزشی راحت، کفش مناسب سالن، حوله و بطری آب همراه داشته باش. این پاسخ صرفاً نمونهٔ نمایشی است." }, { question: "آیا می‌توانم پیش از رزرو از باشگاه بازدید کنم؟", answer: "برای هماهنگی بازدید با پذیرش باشگاه تماس بگیر. این پاسخ صرفاً نمونهٔ نمایشی است." }]} />,
  },
  {
    name: "DynamicIsland",
    title: "تایمر تمرین",
    keywords: "زمان تمرین استراحت تایمر timer workout",
    category: "fitness",
    Preview: () => <WorkoutTimer sessionKey="demo" />,
  },
  {
    name: "ImageCompare",
    keywords: "مقایسه تصویر قبل بعد نمونه مربی",
    category: "cards",
    Preview: () => <ImageCompare before={club.photos[0]!.src} after={club.photos[1]!.src} />,
  },
  {
    name: "ReviewCard",
    title: "کارت نظر",
    keywords: "نظر امتیاز",
    category: "cards",
    Preview: ReviewExample,
  },
  {
    name: "ReviewsSummary",
    keywords: "خلاصه نظرات امتیاز",
    category: "fitness",
    Preview: () => (
      <ReviewsSummary
        counts={{ 1: 2, 2: 3, 3: 8, 4: 24, 5: 63 }}
        locale="fa"
        labels={{
          average: "میانگین امتیاز",
          users: (count) => new Intl.NumberFormat("fa").format(count) + " نظر",
          rating: "امتیاز",
        }}
      />
    ),
  },
  {
    name: "LocationCard",
    title: "کارت مکان",
    keywords: "مکان شهر",
    category: "cards",
    Preview: LocationExample,
  },
  {
    name: "ClubShowcase",
    title: "کارت باشگاه با گالری تعاملی",
    keywords: "باشگاه گالری تصویر اسلاید",
    category: "cards",
    Preview: () => (
      <ClubShowcase club={club} locale="fa" viewLabel="مشاهده باشگاه" />
    ),
  },
  {
    name: "LocationExplorer",
    keywords: "انتخاب استان شهر محله بارگذاری",
    category: "fitness",
    Preview: () => (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          حالت بارگذاری انتخاب‌گر مکان؛ داده‌های این کامپوننت از API دریافت
          می‌شوند.
        </p>
        <LocationExplorer ready={false} onChange={() => undefined} />
      </div>
    ),
  },
  {
    name: "FitnessIllustration",
    keywords: "تصویرسازی ورزش",
    category: "fitness",
    Preview: () => (
      <div className="flex flex-wrap gap-3">
        {(
          [
            "bottle",
            "kettlebell",
            "punchingBag",
            "treadmill",
            "handGrip",
            "watch",
            "jumpRope",
          ] as const
        ).map((kind) => (
          <FitnessIllustration key={kind} kind={kind} size="sm" />
        ))}
      </div>
    ),
  },
];
