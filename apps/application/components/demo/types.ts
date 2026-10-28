import type { ComponentType } from "react";

export const categories = {
  cards: "کارت‌ها",
  sections: "سکشن‌ها",
  controls: "دکمه و فرم",
  display: "نمایش و چیدمان",
  overlays: "منو و پنجره",
  fitness: "جزئیات ورزشی",
  motion: "متن و انیمیشن",
  backgrounds: "پس‌زمینه‌ها",
} as const;

export type DemoCategory = keyof typeof categories;
export type DemoExample = {
  name: string;
  title?: string;
  keywords: string;
  category: DemoCategory;
  Preview: ComponentType;
};
