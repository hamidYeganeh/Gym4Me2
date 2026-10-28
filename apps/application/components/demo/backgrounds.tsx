"use client";

import { useState, type ComponentType } from "react";
import { Button } from "@repo/ui/kit/Button";
import { BubbleBackground } from "@repo/ui/kit/BubbleBackground";
import { FireworksBackground } from "@repo/ui/kit/FireworksBackground";
import { GlyphBackground } from "@repo/ui/kit/GlyphBackground";
import { GradientBackground } from "@repo/ui/kit/GradientBackground";
import { GravityStarsBackground } from "@repo/ui/kit/GravityStarsBackground";
import { HexagonBackground } from "@repo/ui/kit/HexagonBackground";
import { HoleBackground } from "@repo/ui/kit/HoleBackground";
import { StarsBackground } from "@repo/ui/kit/StarsBackground";
import { TopographyBackground } from "@repo/ui/kit/TopographyBackground";
import type { DemoExample } from "./types";

function BackgroundPreview({
  Background,
}: {
  Background: ComponentType<{ className?: string }>;
}) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        aria-pressed={playing}
        onClick={() => setPlaying(!playing)}
      >
        {playing ? "توقف پیش‌نمایش" : "اجرای پیش‌نمایش"}
      </Button>
      <div className="relative isolate h-52 overflow-hidden rounded-2xl bg-muted">
        {playing ? (
          <Background className="absolute inset-0 size-full" />
        ) : (
          <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
            برای دیدن انیمیشن، پیش‌نمایش را اجرا کن.
          </p>
        )}
      </div>
    </div>
  );
}

export const backgroundExamples: DemoExample[] = [
  {
    name: "BubbleBackground",
    keywords: "پس زمینه حباب",
    category: "backgrounds",
    Preview: () => <BackgroundPreview Background={BubbleBackground} />,
  },
  {
    name: "FireworksBackground",
    keywords: "پس زمینه آتش بازی",
    category: "backgrounds",
    Preview: () => <BackgroundPreview Background={FireworksBackground} />,
  },
  {
    name: "GlyphBackground",
    keywords: "پس زمینه حروف",
    category: "backgrounds",
    Preview: () => <BackgroundPreview Background={GlyphBackground} />,
  },
  {
    name: "GradientBackground",
    keywords: "پس زمینه گرادیان",
    category: "backgrounds",
    Preview: () => <BackgroundPreview Background={GradientBackground} />,
  },
  {
    name: "GravityStarsBackground",
    keywords: "پس زمینه ستاره گرانش",
    category: "backgrounds",
    Preview: () => <BackgroundPreview Background={GravityStarsBackground} />,
  },
  {
    name: "HexagonBackground",
    keywords: "پس زمینه شش ضلعی",
    category: "backgrounds",
    Preview: () => <BackgroundPreview Background={HexagonBackground} />,
  },
  {
    name: "HoleBackground",
    keywords: "پس زمینه سیاهچاله",
    category: "backgrounds",
    Preview: () => <BackgroundPreview Background={HoleBackground} />,
  },
  {
    name: "StarsBackground",
    keywords: "پس زمینه ستاره",
    category: "backgrounds",
    Preview: () => <BackgroundPreview Background={StarsBackground} />,
  },
  {
    name: "TopographyBackground",
    keywords: "پس زمینه توپوگرافی",
    category: "backgrounds",
    Preview: () => <BackgroundPreview Background={TopographyBackground} />,
  },
];
