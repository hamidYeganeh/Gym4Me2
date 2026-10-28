"use client";

import { useState } from "react";
import { Dumbbell, FileText, Check, MapPin } from "lucide-react";
import { Button } from "@repo/ui/kit/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@repo/ui/kit/Card";
import { Badge } from "@repo/ui/kit/Badge";
import { Alert, AlertTitle, AlertDescription } from "@repo/ui/kit/Alert";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@repo/ui/kit/Empty";
import { Avatar, AvatarFallback } from "@repo/ui/kit/Avatar";
import { AvatarGroup } from "@repo/ui/kit/AvatarGroup";
import { AspectRatio } from "@repo/ui/kit/AspectRatio";
import { Skeleton } from "@repo/ui/kit/Skeleton";
import { Spinner } from "@repo/ui/kit/Spinner";
import { Progress } from "@repo/ui/kit/Progress";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@repo/ui/kit/Breadcrumb";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@repo/ui/kit/Pagination";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@repo/ui/kit/Accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui/kit/Tabs";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@repo/ui/kit/Collapsible";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@repo/ui/kit/Carousel";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@repo/ui/kit/Table";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@repo/ui/kit/Resizable";
import { ScrollArea } from "@repo/ui/kit/ScrollArea";
import { Separator } from "@repo/ui/kit/Separator";
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
} from "@repo/ui/kit/Item";
import { Kbd, KbdGroup } from "@repo/ui/kit/Kbd";
import {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
} from "@repo/ui/kit/Attachment";
import { Message, MessageContent, MessageFooter } from "@repo/ui/kit/Message";
import {
  MessageScroller,
  MessageScrollerProvider,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
} from "@repo/ui/kit/MessageScroller";
import { Bubble, BubbleContent } from "@repo/ui/kit/Bubble";
import { Marker, MarkerIcon, MarkerContent } from "@repo/ui/kit/Marker";
import {
  BarbellHorizontalIcon,
  HeartIcon,
  Calendar1Icon,
} from "@repo/ui/icons";
import { SocialIcon } from "@repo/ui/kit/SocialIcon";
import { ProgressiveBlur } from "@repo/ui/kit/ProgressiveBlur";
import { ChartContainer } from "@repo/ui/kit/Chart";
import { DirectionProvider } from "@repo/ui/kit/Direction";
import type { DemoExample } from "./types";

function ProgressExample() {
  const [value, setValue] = useState(60);
  return (
    <div className="space-y-4">
      <Progress value={value} aria-label="پیشرفت تمرین" />
      <Button variant="outline" onClick={() => setValue((value + 20) % 120)}>
        پیشرفت: {value}٪
      </Button>
    </div>
  );
}

function PaginationExample() {
  const [page, setPage] = useState(1);
  return (
    <Pagination aria-label="صفحه‌بندی نمونه">
      <PaginationContent>
        {[1, 2, 3].map((value) => (
          <PaginationItem key={value}>
            <PaginationLink
              href="#demo-Pagination"
              isActive={page === value}
              onClick={(event) => {
                event.preventDefault();
                setPage(value);
              }}
            >
              {value}
            </PaginationLink>
          </PaginationItem>
        ))}
      </PaginationContent>
    </Pagination>
  );
}

function MessageExample() {
  return (
    <MessageScrollerProvider>
      <MessageScroller className="h-56">
        <MessageScrollerViewport>
          <MessageScrollerContent>
            {[
              "سلام! جلسهٔ فردا چه ساعتیه؟",
              "ساعت ۱۰، منتظرت هستیم.",
              "ممنون، حتماً میام.",
            ].map((text, index) => (
              <MessageScrollerItem key={text}>
                <Message align={index % 2 ? "start" : "end"}>
                  <MessageContent>
                    <Bubble>
                      <BubbleContent>{text}</BubbleContent>
                    </Bubble>
                  </MessageContent>
                  <MessageFooter>۱۰:۳۰</MessageFooter>
                </Message>
              </MessageScrollerItem>
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

export const displayExamples: DemoExample[] = [
  {
    name: "Chart",
    keywords: "نمودار داده",
    category: "display",
    Preview: () => (
      <ChartContainer
        config={{ visits: { label: "جلسه", color: "var(--primary)" } }}
        className="h-48 w-full"
      >
        <svg
          role="img"
          aria-label="نمودار نمونهٔ جلسات هفتگی"
          viewBox="0 0 320 180"
        >
          <title>جلسات هفتگی: شنبه ۳، دوشنبه ۵، چهارشنبه ۴</title>
          {[60, 100, 80].map((height, index) => (
            <g key={index}>
              <rect
                x={40 + index * 90}
                y={140 - height}
                width={45}
                height={height}
                rx={8}
                fill="var(--color-visits)"
              />
              <text
                x={62 + index * 90}
                y={164}
                textAnchor="middle"
                fill="currentColor"
                fontSize={12}
              >
                {["شنبه", "دوشنبه", "چهارشنبه"][index]}
              </text>
            </g>
          ))}
        </svg>
      </ChartContainer>
    ),
  },
  {
    name: "Direction",
    keywords: "راست چپ جهت RTL LTR",
    category: "display",
    Preview: () => (
      <div className="space-y-3">
        {(["rtl", "ltr"] as const).map((dir) => (
          <DirectionProvider key={dir} dir={dir}>
            <Tabs defaultValue="one" dir={dir}>
              <TabsList>
                <TabsTrigger value="one">{dir.toUpperCase()} · ۱</TabsTrigger>
                <TabsTrigger value="two">{dir.toUpperCase()} · ۲</TabsTrigger>
              </TabsList>
              <TabsContent value="one">
                جهت چیدمان {dir.toUpperCase()}
              </TabsContent>
              <TabsContent value="two">زبانهٔ دوم</TabsContent>
            </Tabs>
          </DirectionProvider>
        ))}
      </div>
    ),
  },
  {
    name: "Card",
    title: "کارت عمومی",
    keywords: "کارت عنوان محتوا",
    category: "cards",
    Preview: () => (
      <Card>
        <CardHeader>
          <CardTitle>برنامهٔ امروز</CardTitle>
          <CardDescription>یک نمونه از کارت استاندارد</CardDescription>
        </CardHeader>
        <CardContent>۴۵ دقیقه تمرین قدرتی</CardContent>
        <CardFooter>
          <Badge>آمادهٔ شروع</Badge>
        </CardFooter>
      </Card>
    ),
  },
  {
    name: "Badge",
    keywords: "نشان وضعیت",
    category: "display",
    Preview: () => (
      <div className="flex flex-wrap gap-2">
        {(["default", "secondary", "outline", "destructive"] as const).map(
          (variant) => (
            <Badge key={variant} variant={variant}>
              {variant}
            </Badge>
          ),
        )}
      </div>
    ),
  },
  {
    name: "Alert",
    keywords: "هشدار پیام",
    category: "display",
    Preview: () => (
      <Alert>
        <Check />
        <AlertTitle>رزرو نمونه تأیید شد</AlertTitle>
        <AlertDescription>این پیام برای نمایش کامپوننت است.</AlertDescription>
      </Alert>
    ),
  },
  {
    name: "Empty",
    keywords: "وضعیت خالی",
    category: "display",
    Preview: () => (
      <Empty>
        <EmptyHeader>
          <Dumbbell className="mx-auto size-8" />
          <EmptyTitle>هنوز تمرینی نداری</EmptyTitle>
          <EmptyDescription>
            تمرین‌های نمونه اینجا نمایش داده می‌شوند.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Badge variant="outline">نمونهٔ حالت خالی</Badge>
        </EmptyContent>
      </Empty>
    ),
  },
  {
    name: "Avatar / AvatarGroup",
    keywords: "آواتار تصویر کاربر گروه",
    category: "display",
    Preview: () => (
      <AvatarGroup className="flex items-center -space-x-2" dir="ltr">
        {["م‌ا", "س‌ر", "ن‌ک"].map((name) => (
          <Avatar key={name} className="border-2 border-background">
            <AvatarFallback>{name}</AvatarFallback>
          </Avatar>
        ))}
      </AvatarGroup>
    ),
  },
  {
    name: "AspectRatio / ProgressiveBlur",
    keywords: "تصویر نسبت محوشدگی",
    category: "display",
    Preview: () => (
      <AspectRatio
        ratio={16 / 9}
        className="relative overflow-hidden rounded-2xl"
      >
        <div
          role="img"
          aria-label="سالن بدنسازی"
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/images/clubs/strength.png)" }}
        />
        <ProgressiveBlur className="absolute inset-x-0 bottom-0 h-1/2" />
        <p className="absolute inset-x-4 bottom-4 text-white">باشگاه اطلس</p>
      </AspectRatio>
    ),
  },
  {
    name: "Skeleton / Spinner",
    keywords: "بارگذاری اسکلت لودینگ",
    category: "display",
    Preview: () => (
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Spinner aria-label="در حال بارگذاری" />
      </div>
    ),
  },
  {
    name: "Progress",
    keywords: "پیشرفت درصد",
    category: "display",
    Preview: ProgressExample,
  },
  {
    name: "Breadcrumb",
    keywords: "مسیر راهنما",
    category: "display",
    Preview: () => (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">خانه</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>دمو</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    ),
  },
  {
    name: "Pagination",
    keywords: "صفحه بندی",
    category: "display",
    Preview: PaginationExample,
  },
  {
    name: "Accordion",
    keywords: "آکاردئون سوال جواب",
    category: "display",
    Preview: () => (
      <Accordion type="single" collapsible>
        <AccordionItem value="one">
          <AccordionTrigger>چطور باشگاه انتخاب کنم؟</AccordionTrigger>
          <AccordionContent>
            از بخش جست‌وجو، باشگاه‌های اطرافت را ببین.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="two">
          <AccordionTrigger>این یک نمونه است؟</AccordionTrigger>
          <AccordionContent>
            بله؛ همهٔ داده‌های این صفحه نمایشی هستند.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    ),
  },
  {
    name: "Tabs",
    keywords: "تب زبانه",
    category: "display",
    Preview: () => (
      <Tabs defaultValue="today" dir="rtl">
        <TabsList>
          <TabsTrigger value="today">امروز</TabsTrigger>
          <TabsTrigger value="week">این هفته</TabsTrigger>
        </TabsList>
        <TabsContent value="today">یک جلسهٔ تمرین قدرتی</TabsContent>
        <TabsContent value="week">سه جلسهٔ تمرین و دو روز استراحت</TabsContent>
      </Tabs>
    ),
  },
  {
    name: "Collapsible",
    keywords: "باز بسته جزئیات",
    category: "display",
    Preview: () => (
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="outline">نمایش / پنهان‌کردن جزئیات</Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 text-sm">
          جزئیات نمونهٔ عضویت در باشگاه
        </CollapsibleContent>
      </Collapsible>
    ),
  },
  {
    name: "Carousel",
    keywords: "کاروسل اسلایدر",
    category: "display",
    Preview: () => (
      <Carousel opts={{ direction: "rtl" }} className="mx-10">
        <CarouselContent>
          {["قدرت", "تعادل", "انعطاف"].map((title) => (
            <CarouselItem key={title}>
              <div className="flex h-32 items-center justify-center rounded-xl bg-muted text-xl font-bold">
                {title}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    ),
  },
  {
    name: "Table",
    keywords: "جدول داده",
    category: "display",
    Preview: () => (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>جلسه</TableHead>
            <TableHead>مدت</TableHead>
            <TableHead>وضعیت</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {["قدرتی", "هوازی"].map((title) => (
            <TableRow key={title}>
              <TableCell>{title}</TableCell>
              <TableCell>۴۵ دقیقه</TableCell>
              <TableCell>
                <Badge variant="secondary">برنامه‌ریزی‌شده</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    ),
  },
  {
    name: "Resizable",
    keywords: "تغییر اندازه پنل",
    category: "display",
    Preview: () => (
      <ResizablePanelGroup
        orientation="horizontal"
        className="min-h-32 rounded-xl border"
      >
        <ResizablePanel defaultSize="50%">
          <div className="p-4">پنل اول</div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize="50%">
          <div className="p-4">پنل دوم</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    ),
  },
  {
    name: "ScrollArea / Separator",
    keywords: "اسکرول جداکننده",
    category: "display",
    Preview: () => (
      <ScrollArea className="h-40 rounded-xl border p-4">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index}>
            <p className="py-3 text-sm">جلسهٔ {index + 1}</p>
            <Separator />
          </div>
        ))}
      </ScrollArea>
    ),
  },
  {
    name: "Item",
    keywords: "آیتم ردیف",
    category: "display",
    Preview: () => (
      <Item variant="outline">
        <ItemMedia>
          <Dumbbell />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>تمرین قدرتی</ItemTitle>
          <ItemDescription>یک ردیف با آیکون و توضیحات</ItemDescription>
        </ItemContent>
      </Item>
    ),
  },
  {
    name: "Kbd",
    keywords: "کلید میانبر کیبورد",
    category: "display",
    Preview: () => (
      <div className="flex items-center gap-3">
        <span className="text-sm">جست‌وجو</span>
        <KbdGroup dir="ltr">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </div>
    ),
  },
  {
    name: "Attachment",
    keywords: "فایل پیوست",
    category: "display",
    Preview: () => (
      <Attachment state="done">
        <AttachmentMedia>
          <FileText />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>برنامهٔ تمرین.pdf</AttachmentTitle>
          <AttachmentDescription>
            ۲۴۰ کیلوبایت · فایل نمونه
          </AttachmentDescription>
        </AttachmentContent>
      </Attachment>
    ),
  },
  {
    name: "Message / MessageScroller / Bubble",
    keywords: "پیام گفتگو چت حباب",
    category: "display",
    Preview: MessageExample,
  },
  {
    name: "Marker",
    keywords: "نشانگر محل",
    category: "display",
    Preview: () => (
      <Marker variant="separator">
        <MarkerIcon>
          <MapPin />
        </MarkerIcon>
        <MarkerContent>تهران</MarkerContent>
      </Marker>
    ),
  },
  {
    name: "SandowIcon / SocialIcon",
    keywords: "آیکون سندو شبکه اجتماعی",
    category: "display",
    Preview: () => (
      <div className="flex flex-wrap items-center gap-5 text-3xl">
        <BarbellHorizontalIcon label="وزنه" />
        <HeartIcon label="قلب" />
        <Calendar1Icon label="تقویم" />
        {(["instagram", "linkedin", "facebook"] as const).map((platform) => (
          <span key={platform} role="img" aria-label={platform}>
            <SocialIcon platform={platform} className="size-7" />
          </span>
        ))}
      </div>
    ),
  },
];
