"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, RotateCcw, Search } from "lucide-react";
import { Button } from "@repo/ui/kit/Button";
import { Badge } from "@repo/ui/kit/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/kit/Card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@repo/ui/kit/InputGroup";
import { AnimatedThemeToggler } from "@repo/ui/kit/AnimatedThemeToggler";
import { controlExamples } from "./controls";
import { displayExamples } from "./display";
import { overlayExamples } from "./overlays";
import { fitnessExamples } from "./fitness";
import { motionExamples } from "./motion";
import { backgroundExamples } from "./backgrounds";
import { sectionExamples } from "./sections";
import { categories, type DemoCategory } from "./types";

const examples = [
  ...controlExamples,
  ...displayExamples,
  ...overlayExamples,
  ...fitnessExamples,
  ...motionExamples,
  ...backgroundExamples,
  ...sectionExamples,
];

export function DemoGallery({
  initialCategory,
}: { initialCategory?: string } = {}) {
  const [category, setCategory] = useState<DemoCategory>(
    initialCategory && Object.hasOwn(categories, initialCategory)
      ? (initialCategory as DemoCategory)
      : "cards",
  );
  const [search, setSearch] = useState("");
  const [version, setVersion] = useState(0);
  const query = search.trim().toLocaleLowerCase();
  const visible = examples.filter((example) =>
    query
      ? `${example.name} ${example.title ?? ""} ${example.keywords} ${categories[example.category]}`
          .toLocaleLowerCase()
          .includes(query)
      : example.category === category,
  );

  return (
    <main
      dir="rtl"
      className="space-y-6 px-4 pt-[calc(1.5rem+var(--app-safe-top))] pb-28"
    >
      <header className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowRight />
              خانه
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">فقط توسعه</Badge>
            <AnimatedThemeToggler label="تغییر تم" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">دمو</h1>
          <p className="text-sm leading-7 text-muted-foreground">
            کارت‌ها، سکشن‌ها و کامپوننت‌های موجود برنامه؛ نمونه‌ها را ببین و
            کنترل‌ها و انیمیشن‌ها را امتحان کن.
          </p>
        </div>
        <InputGroup>
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="جست‌وجوی کامپوننت"
            placeholder="جست‌وجو با نام فارسی یا انگلیسی…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </InputGroup>
        <nav
          aria-label="دسته‌بندی کامپوننت‌ها"
          className="flex flex-wrap gap-2"
        >
          {Object.entries(categories).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={!query && category === key ? "default" : "outline"}
              aria-pressed={!query && category === key}
              onClick={() => {
                setCategory(key as DemoCategory);
                setSearch("");
              }}
            >
              {label}
            </Button>
          ))}
        </nav>
      </header>
      <div className="flex items-center justify-between gap-3">
        <p role="status" className="text-sm text-muted-foreground">
          {new Intl.NumberFormat("fa").format(visible.length)} نمونه
          {query ? " پیدا شد" : ` در ${categories[category]}`}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setVersion((value) => value + 1)}
        >
          <RotateCcw />
          بازنشانی
        </Button>
      </div>
      <div key={version} className="space-y-5">
        {visible.map(({ name, title, Preview }) => (
          <Card
            key={name}
            id={`demo-${name.replaceAll(" / ", "-").replace(/\s+/g, "-")}`}
            className="min-w-0 scroll-mt-6 overflow-hidden"
          >
            <CardHeader>
              <CardTitle className="text-start text-base font-semibold">
                <h2 dir={title ? "rtl" : "ltr"}>{title ?? name}</h2>
              </CardTitle>
              {title && (
                <p
                  dir="ltr"
                  className="text-start text-xs text-muted-foreground"
                >
                  {name}
                </p>
              )}
            </CardHeader>
            <CardContent className="min-w-0 space-y-4">
              <Preview />
            </CardContent>
          </Card>
        ))}
        {visible.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">
            کامپوننتی با این نام پیدا نشد.
          </p>
        )}
      </div>
    </main>
  );
}
