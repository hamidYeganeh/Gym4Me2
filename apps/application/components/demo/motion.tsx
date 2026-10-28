"use client";

import { useTheme } from "@repo/theme/provider";
import {
  CheckIcon as Check,
  Copy1Icon as Copy,
  HeartIcon as Heart,
  MoonIcon as Moon,
  StarFullIcon as Star,
  SunIcon as Sun,
} from "@repo/ui/icons";
import { AnimatedThemeToggler } from "@repo/ui/kit/AnimatedThemeToggler";
import { AnimateIcon } from "@repo/ui/kit/AnimateIcon";
import { AnimateUIProvider } from "@repo/ui/kit/AnimateUIProvider";
import { AutoHeight } from "@repo/ui/kit/AutoHeight";
import { Blur } from "@repo/ui/kit/Blur";
import { Button, buttonVariants } from "@repo/ui/kit/Button";
import { Click } from "@repo/ui/kit/Click";
import { CodeBlock } from "@repo/ui/kit/CodeBlock";
import { CopyButton, CopyButtonIcon } from "@repo/ui/kit/CopyButton";
import { CountingNumber } from "@repo/ui/kit/CountingNumber";
import { Cursor, CursorContainer, CursorProvider } from "@repo/ui/kit/Cursor";
import { Effect } from "@repo/ui/kit/Effect";
import { Fade } from "@repo/ui/kit/Fade";
import {
  FlipButton,
  FlipButtonBack,
  FlipButtonFront,
} from "@repo/ui/kit/FlipButton";
import { GithubStars, GithubStarsNumber } from "@repo/ui/kit/GitHubStars";
import {
  GitHubStarsButton,
  GitHubStarsButtonNumber,
} from "@repo/ui/kit/GitHubStarsButton";
import { GradientText } from "@repo/ui/kit/GradientText";
import { Highlight } from "@repo/ui/kit/Highlight";
import { HighlightText } from "@repo/ui/kit/HighlightText";
import { IconButton, IconButtonParticles } from "@repo/ui/kit/IconButton";
import { ImageZoom, Image as ZoomImage } from "@repo/ui/kit/ImageZoom";
import { LiquidButton } from "@repo/ui/kit/LiquidButton";
import { Magnetic } from "@repo/ui/kit/Magnetic";
import { MorphingText } from "@repo/ui/kit/MorphingText";
import { MotionGrid, MotionGridCells } from "@repo/ui/kit/MotionGrid";
import { PageTransition } from "@repo/ui/kit/PageTransition";
import { Particles, ParticlesEffect } from "@repo/ui/kit/Particles";
import {
  PinnedList,
  PinnedListItem,
  PinnedListItems,
  PinnedListPinned,
  PinnedListUnpinned,
} from "@repo/ui/kit/PinnedList";
import { RippleButton, RippleButtonRipples } from "@repo/ui/kit/RippleButton";
import { RollingText } from "@repo/ui/kit/RollingText";
import { RotatingText, RotatingTextContainer } from "@repo/ui/kit/RotatingText";
import { ScrollFade } from "@repo/ui/kit/ScrollFade";
import {
  ScrollingNumber,
  ScrollingNumberContainer,
  ScrollingNumberHighlight,
  ScrollingNumberItems,
} from "@repo/ui/kit/ScrollingNumber";
import {
  ScrollProgress,
  ScrollProgressContainer,
  ScrollProgressProvider,
} from "@repo/ui/kit/ScrollProgress";
import { ShimmeringText } from "@repo/ui/kit/ShimmeringText";
import { Shine } from "@repo/ui/kit/Shine";
import { Slide } from "@repo/ui/kit/Slide";
import { SlidingNumber } from "@repo/ui/kit/SlidingNumber";
import { SlidingText } from "@repo/ui/kit/SlidingText";
import { SplittingText } from "@repo/ui/kit/SplittingText";
import { Spring, SpringElement, SpringProvider } from "@repo/ui/kit/Spring";
import { SwappingText } from "@repo/ui/kit/SwappingText";
import { ThemeToggler } from "@repo/ui/kit/ThemeToggler";
import { ThemeTogglerButton } from "@repo/ui/kit/ThemeTogglerButton";
import { Tilt, TiltContent } from "@repo/ui/kit/Tilt";
import { TypingText, TypingTextCursor } from "@repo/ui/kit/TypingText";
import { Zoom } from "@repo/ui/kit/Zoom";
import { useRef, useState } from "react";
import type { DemoExample } from "./types";

const text = "برای خودت وقت بذار";
const words = ["قدرت", "تعادل", "انرژی"];
const tile = "rounded-xl bg-muted p-5 text-center text-lg font-semibold";

function NumberExample() {
  const [number, setNumber] = useState(128);
  return (
    <div className="flex flex-wrap items-center gap-5">
      <SlidingNumber
        value={number}
        locale="fa"
        className="text-3xl font-bold"
      />
      <CountingNumber number={number} className="text-3xl font-bold" />
      <Button variant="outline" onClick={() => setNumber(number + 37)}>
        افزایش عدد
      </Button>
    </div>
  );
}

function HeightExample() {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-3">
      <Button variant="outline" onClick={() => setOpen(!open)}>
        تغییر ارتفاع
      </Button>
      <AutoHeight className="overflow-hidden rounded-xl bg-muted">
        <div className="p-4">
          <p>محتوای ثابت</p>
          {open && (
            <p className="mt-4 leading-8">
              این متن اضافه با تغییر ارتفاع نرم نمایش داده می‌شود. دوباره روی
              دکمه بزن تا بسته شود.
            </p>
          )}
        </div>
      </AutoHeight>
    </div>
  );
}

function ThemeExample() {
  const { resolvedTheme, theme, setTheme } = useTheme();
  const resolved = resolvedTheme === "light" ? "light" : "dark";
  const selection = theme === "light" || theme === "dark" ? theme : "system";
  return (
    <div className="flex items-center gap-3">
      <AnimatedThemeToggler label="تغییر تم دایره‌ای" />
      <ThemeTogglerButton
        aria-label="تغییر تم"
        theme={selection}
        resolvedTheme={resolved}
        setTheme={setTheme}
      >
        {resolved === "dark" ? <Moon /> : <Sun />}
      </ThemeTogglerButton>
      <ThemeToggler
        theme={selection}
        resolvedTheme={resolved}
        setTheme={setTheme}
      >
        {({ toggleTheme }) => (
          <Button
            variant="outline"
            onClick={() => toggleTheme(resolved === "dark" ? "light" : "dark")}
          >
            تم روشن / تیره
          </Button>
        )}
      </ThemeToggler>
    </div>
  );
}

function PinExample() {
  const [pinned, setPinned] = useState<string[]>(["قدرت"]);
  const item = (name: string) => (
    <PinnedListItem
      key={name}
      id={name}
      className="cursor-pointer rounded-xl bg-muted p-3"
    >
      {name} · برای سنجاق‌کردن یا برداشتن کلیک کن
    </PinnedListItem>
  );
  return (
    <PinnedList
      className="space-y-3"
      onPinnedChange={(name) =>
        setPinned(
          pinned.includes(name)
            ? pinned.filter((value) => value !== name)
            : [...pinned, name],
        )
      }
    >
      <PinnedListPinned>
        <PinnedListItems className="space-y-2">
          {words.filter((name) => pinned.includes(name)).map(item)}
        </PinnedListItems>
      </PinnedListPinned>
      <PinnedListUnpinned>
        <PinnedListItems className="space-y-2">
          {words.filter((name) => !pinned.includes(name)).map(item)}
        </PinnedListItems>
      </PinnedListUnpinned>
    </PinnedList>
  );
}

function ClickExample() {
  const scope = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={scope}
      className="relative isolate overflow-hidden rounded-xl border p-6 text-center"
    >
      <Click variant="burst" scope={scope} />
      داخل این کادر کلیک کن
    </div>
  );
}

function PageTransitionExample() {
  const [page, setPage] = useState(0);
  return (
    <div className="space-y-3">
      <Button variant="outline" onClick={() => setPage(page + 1)}>
        تغییر نمای نمونه
      </Button>
      <PageTransition pageKey={page} effect="fade">
        <div className={tile}>{page % 2 ? "نمای دوم" : "نمای اول"}</div>
      </PageTransition>
    </div>
  );
}

export const motionExamples: DemoExample[] = [
  {
    name: "AnimateIcon",
    keywords: "آیکون متحرک",
    category: "motion",
    Preview: () => (
      <AnimateIcon
        animateOnHover
        whileHover={{ scale: 1.2, rotate: 12 }}
        className="inline-flex rounded-full bg-muted p-4"
      >
        <Heart aria-label="قلب متحرک" className="size-8 text-primary" />
      </AnimateIcon>
    ),
  },
  {
    name: "RippleButton",
    keywords: "دکمه موج",
    category: "motion",
    Preview: () => (
      <RippleButton className={buttonVariants()}>
        <RippleButtonRipples />
        کلیک کن
      </RippleButton>
    ),
  },
  {
    name: "LiquidButton",
    keywords: "دکمه مایع",
    category: "motion",
    Preview: () => <LiquidButton>دکمهٔ مایع</LiquidButton>,
  },
  {
    name: "FlipButton",
    keywords: "دکمه چرخش",
    category: "motion",
    Preview: () => (
      <FlipButton className="rounded-full bg-primary px-6 py-3 text-primary-foreground">
        <FlipButtonFront>شروع تمرین</FlipButtonFront>
        <FlipButtonBack>آماده‌ای؟</FlipButtonBack>
      </FlipButton>
    ),
  },
  {
    name: "CopyButton",
    keywords: "کپی کلیپ بورد",
    category: "motion",
    Preview: () => (
      <CopyButton
        content="Gym4Me"
        className={buttonVariants({ variant: "outline" })}
      >
        <CopyButtonIcon
          icon={<Copy className="size-4" />}
          copiedIcon={<Check className="size-4" />}
        />
        کپی نام برنامه
      </CopyButton>
    ),
  },
  {
    name: "IconButton",
    keywords: "دکمه آیکون ذرات قلب",
    category: "motion",
    Preview: () => (
      <IconButton
        aria-label="پسندیدن نمونه"
        className={buttonVariants({ size: "icon", variant: "outline" })}
      >
        <Heart className="size-5" />
        <IconButtonParticles />
      </IconButton>
    ),
  },
  {
    name: "GitHubStars / GitHubStarsButton",
    keywords: "ستاره گیت هاب شمارنده",
    category: "motion",
    Preview: () => (
      <div className="flex items-center gap-4" dir="ltr">
        <GithubStars value={128} className="flex gap-2">
          <Star className="size-5" />
          <GithubStarsNumber />
        </GithubStars>
        <GitHubStarsButton value={256}>
          <Star className="size-4" />
          <GitHubStarsButtonNumber />
        </GitHubStarsButton>
      </div>
    ),
  },
  {
    name: "AnimatedThemeToggler / ThemeToggler / ThemeTogglerButton",
    keywords: "تم روشن تیره تغییر",
    category: "motion",
    Preview: ThemeExample,
  },
  {
    name: "GradientText",
    keywords: "متن گرادیان",
    category: "motion",
    Preview: () => <GradientText text={text} className="text-2xl font-bold" />,
  },
  {
    name: "HighlightText",
    keywords: "متن هایلایت",
    category: "motion",
    Preview: () => <HighlightText text={text} className="text-xl" />,
  },
  {
    name: "MorphingText",
    keywords: "متن تبدیل",
    category: "motion",
    Preview: () => <MorphingText text={words} className="text-2xl font-bold" />,
  },
  {
    name: "RollingText",
    keywords: "متن غلتان",
    category: "motion",
    Preview: () => <RollingText text="Gym4Me" className="text-3xl font-bold" />,
  },
  {
    name: "RotatingText",
    keywords: "متن چرخشی",
    category: "motion",
    Preview: () => (
      <RotatingTextContainer text={words} className="text-2xl font-bold">
        <RotatingText />
      </RotatingTextContainer>
    ),
  },
  {
    name: "ShimmeringText",
    keywords: "متن درخشان",
    category: "motion",
    Preview: () => (
      <ShimmeringText text={text} className="text-2xl font-bold" />
    ),
  },
  {
    name: "SlidingText",
    keywords: "متن لغزنده",
    category: "motion",
    Preview: () => (
      <SlidingText
        text="روی متن کلیک کن"
        trigger="click"
        className="cursor-pointer text-2xl font-bold"
      />
    ),
  },
  {
    name: "SplittingText",
    keywords: "متن تکه کلمه",
    category: "motion",
    Preview: () => (
      <SplittingText text={text} type="words" className="text-2xl font-bold" />
    ),
  },
  {
    name: "SwappingText",
    keywords: "متن جابجایی",
    category: "motion",
    Preview: () => <SwappingText text={words} className="text-2xl font-bold" />,
  },
  {
    name: "TypingText",
    keywords: "متن تایپ",
    category: "motion",
    Preview: () => (
      <span className="text-2xl font-bold">
        <TypingText text={text}>
          <TypingTextCursor />
        </TypingText>
      </span>
    ),
  },
  {
    name: "SlidingNumber / CountingNumber",
    keywords: "عدد شمارنده فارسی",
    category: "motion",
    Preview: NumberExample,
  },
  {
    name: "ScrollingNumber",
    keywords: "عدد اسکرول",
    category: "motion",
    Preview: () => (
      <ScrollingNumberContainer
        number={50}
        step={10}
        itemsSize={40}
        className="mx-auto text-center"
      >
        <ScrollingNumberHighlight className="rounded-lg bg-primary/10" />
        <ScrollingNumber>
          <ScrollingNumberItems />
        </ScrollingNumber>
      </ScrollingNumberContainer>
    ),
  },
  {
    name: "Fade / Blur / Slide / Zoom / Effect / AnimateUIProvider",
    keywords: "انیمیشن ورود محو بزرگنمایی",
    category: "motion",
    Preview: () => (
      <AnimateUIProvider>
        <div className="grid grid-cols-2 gap-3">
          <Fade>
            <div className={tile}>Fade</div>
          </Fade>
          <Blur>
            <div className={tile}>Blur</div>
          </Blur>
          <Slide>
            <div className={tile}>Slide</div>
          </Slide>
          <Zoom>
            <div className={tile}>Zoom</div>
          </Zoom>
          <Effect fade slide blur>
            <div className={tile}>Effect</div>
          </Effect>
        </div>
      </AnimateUIProvider>
    ),
  },
  {
    name: "AutoHeight",
    keywords: "ارتفاع خودکار",
    category: "motion",
    Preview: HeightExample,
  },
  {
    name: "Tilt / Shine / Magnetic",
    keywords: "شیب درخشش مغناطیسی",
    category: "motion",
    Preview: () => (
      <div className="space-y-4">
        <Tilt>
          <TiltContent>
            <Shine enableOnHover className={tile}>
              نشانگر را حرکت بده
            </Shine>
          </TiltContent>
        </Tilt>
        <Magnetic>
          <Button variant="outline">دکمهٔ مغناطیسی</Button>
        </Magnetic>
      </div>
    ),
  },
  {
    name: "Highlight",
    keywords: "هایلایت انتخاب",
    category: "motion",
    Preview: () => (
      <Highlight hover className="rounded-xl bg-primary/15">
        {words.map((word) => (
          <button type="button" key={word} className="px-5 py-3">
            {word}
          </button>
        ))}
      </Highlight>
    ),
  },
  {
    name: "ImageZoom",
    keywords: "تصویر بزرگنمایی",
    category: "motion",
    Preview: () => (
      <ImageZoom className="h-48 overflow-hidden rounded-xl">
        <ZoomImage
          src="/images/clubs/strength.png"
          alt="سالن بدنسازی؛ برای بزرگنمایی کلیک کن"
          className="size-full object-cover"
        />
      </ImageZoom>
    ),
  },
  {
    name: "ScrollFade",
    keywords: "اسکرول محوشدگی لبه",
    category: "motion",
    Preview: () => (
      <ScrollFade className="h-32 overflow-y-auto">
        {Array.from({ length: 10 }, (_, index) => (
          <p key={index} className="p-3">
            ردیف نمونهٔ {index + 1}
          </p>
        ))}
      </ScrollFade>
    ),
  },
  {
    name: "Particles",
    keywords: "ذرات انیمیشن",
    category: "motion",
    Preview: () => (
      <Particles className={tile}>
        <ParticlesEffect />
        انرژی بیشتر
      </Particles>
    ),
  },
  {
    name: "Click",
    keywords: "افکت کلیک",
    category: "motion",
    Preview: ClickExample,
  },
  {
    name: "Cursor",
    keywords: "نشانگر ماوس",
    category: "motion",
    Preview: () => (
      <CursorProvider>
        <CursorContainer className="relative h-32 rounded-xl border p-4">
          نشانگر را داخل کادر حرکت بده
          <Cursor>
            <span className="size-5 rounded-full bg-primary/50" />
          </Cursor>
        </CursorContainer>
      </CursorProvider>
    ),
  },
  {
    name: "MotionGrid",
    keywords: "شبکه متحرک",
    category: "motion",
    Preview: () => (
      <MotionGrid
        gridSize={[3, 3]}
        frames={[
          [
            [0, 0],
            [1, 1],
            [2, 2],
          ],
          [
            [0, 2],
            [1, 1],
            [2, 0],
          ],
        ]}
        className="mx-auto gap-2"
      >
        <MotionGridCells
          className="size-8 rounded-lg bg-muted"
          activeProps={{ className: "bg-primary" }}
        />
      </MotionGrid>
    ),
  },
  {
    name: "Spring",
    keywords: "فنر درگ کشیدن",
    category: "motion",
    Preview: () => (
      <div className="relative flex h-48 items-center justify-center overflow-hidden rounded-xl bg-muted">
        <SpringProvider>
          <Spring className="pointer-events-none absolute inset-0 size-full text-primary" />
          <SpringElement>
            <div className="grid size-16 cursor-grab place-items-center rounded-full bg-primary text-sm text-primary-foreground">
              بکش
            </div>
          </SpringElement>
        </SpringProvider>
      </div>
    ),
  },
  {
    name: "PinnedList",
    keywords: "فهرست سنجاق پین",
    category: "motion",
    Preview: PinExample,
  },
  {
    name: "ScrollProgress",
    keywords: "پیشرفت اسکرول",
    category: "motion",
    Preview: () => (
      <ScrollProgressProvider>
        <ScrollProgress className="h-1 rounded-full bg-primary" />
        <ScrollProgressContainer className="mt-3 h-32 overflow-y-auto">
          {Array.from({ length: 12 }, (_, index) => (
            <p key={index} className="p-3">
              ردیف {index + 1}
            </p>
          ))}
        </ScrollProgressContainer>
      </ScrollProgressProvider>
    ),
  },
  {
    name: "CodeBlock",
    keywords: "کد برنامه نویسی",
    category: "motion",
    Preview: () => (
      <CodeBlock
        code={'import { Button } from "@repo/ui/kit/Button";'}
        lang="tsx"
        className="overflow-x-auto rounded-xl bg-muted p-4 text-sm"
        dir="ltr"
      />
    ),
  },
  {
    name: "PageTransition",
    keywords: "انتقال صفحه",
    category: "motion",
    Preview: PageTransitionExample,
  },
];
