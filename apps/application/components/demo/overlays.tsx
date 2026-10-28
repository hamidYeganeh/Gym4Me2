"use client";

import { useState } from "react";
import { Button } from "@repo/ui/kit/Button";
import { TextField } from "@repo/ui/kit/TextField";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@repo/ui/kit/Dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@repo/ui/kit/AlertDialog";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@repo/ui/kit/Sheet";
import { BottomSheet } from "@repo/ui/kit/BottomSheet";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@repo/ui/kit/Drawer";
import { Popover, PopoverTrigger, PopoverContent } from "@repo/ui/kit/Popover";
import { Tooltip, TooltipTrigger, TooltipContent } from "@repo/ui/kit/Tooltip";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@repo/ui/kit/HoverCard";
import {
  PreviewLinkCard,
  PreviewLinkCardTrigger,
  PreviewLinkCardPortal,
  PreviewLinkCardContent,
  PreviewLinkCardImage,
} from "@repo/ui/kit/PreviewLinkCard";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@repo/ui/kit/DropdownMenu";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "@repo/ui/kit/ContextMenu";
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
} from "@repo/ui/kit/Menubar";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from "@repo/ui/kit/NavigationMenu";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@repo/ui/kit/Command";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@repo/ui/kit/Sidebar";
import { toast } from "@repo/ui/kit/Sileo";
import { Toast } from "@repo/ui/kit/Toast";
import type { DemoExample } from "./types";

function BottomSheetExample() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        بازکردن پنل پایین
      </Button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="فیلترهای نمونه"
        description="یک پنل با عنوان، محتوا و دکمهٔ تأیید"
        footer={<Button onClick={() => setOpen(false)}>تمام</Button>}
      >
        <TextField type="search" label="نام باشگاه" placeholder="جست‌وجو…" />
      </BottomSheet>
    </>
  );
}

function DropdownExample() {
  const [checked, setChecked] = useState(true);
  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild>
        <Button variant="outline">گزینه‌ها</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => toast.info("ویرایش نمونه")}>
          ویرایش
        </DropdownMenuItem>
        <DropdownMenuCheckboxItem
          checked={checked}
          onCheckedChange={setChecked}
        >
          نمایش اعلان
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => toast.success("نمونه ذخیره شد")}>
          ذخیره
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PrimitiveToastContent() {
  const manager = Toast.useToastManager();
  return (
    <>
      <Button
        variant="outline"
        onClick={() =>
          manager.add({
            title: "اعلان نمونه",
            description: "اعلان مستقل Base UI",
          })
        }
      >
        نمایش Toast
      </Button>
      <Toast.Portal>
        <Toast.Viewport className="fixed inset-x-4 top-6 z-100 mx-auto flex max-w-sm flex-col gap-2">
          {manager.toasts.map((item) => (
            <Toast.Root
              key={item.id}
              toast={item}
              className="rounded-2xl border bg-popover p-4 shadow-lg"
            >
              <Toast.Content>
                <Toast.Title className="font-semibold" />
                <Toast.Description className="mt-2 text-sm text-muted-foreground" />
                <Toast.Close
                  aria-label="بستن اعلان"
                  className="mt-3 text-sm underline"
                >
                  بستن
                </Toast.Close>
              </Toast.Content>
            </Toast.Root>
          ))}
        </Toast.Viewport>
      </Toast.Portal>
    </>
  );
}

export const overlayExamples: DemoExample[] = [
  {
    name: "Dialog",
    keywords: "دیالوگ پنجره مودال",
    category: "overlays",
    Preview: () => (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">بازکردن دیالوگ</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>دیالوگ نمونه</DialogTitle>
            <DialogDescription>
              ورودی، دکمهٔ بستن و مدیریت فوکوس را امتحان کن.
            </DialogDescription>
          </DialogHeader>
          <TextField label="نام جلسه" placeholder="تمرین صبحگاهی" />
          <DialogFooter>
            <DialogClose asChild>
              <Button>تمام</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    ),
  },
  {
    name: "AlertDialog",
    keywords: "تایید هشدار حذف",
    category: "overlays",
    Preview: () => (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">نمایش تأیید</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>نمونه حذف شود؟</AlertDialogTitle>
            <AlertDialogDescription>
              این عمل صرفاً یک اعلان نمایشی نشان می‌دهد.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toast.success("حذف نمونه انجام شد")}
            >
              تأیید نمونه
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    ),
  },
  {
    name: "Sheet",
    keywords: "پنل کناری شیت",
    category: "overlays",
    Preview: () => (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">بازکردن پنل کناری</Button>
        </SheetTrigger>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>پنل نمونه</SheetTitle>
            <SheetDescription>محتوای پنل کناری</SheetDescription>
          </SheetHeader>
          <div className="p-5">
            <TextField label="جست‌وجو" />
          </div>
        </SheetContent>
      </Sheet>
    ),
  },
  {
    name: "BottomSheet",
    keywords: "پنل پایین فیلتر",
    category: "overlays",
    Preview: BottomSheetExample,
  },
  {
    name: "Drawer",
    keywords: "کشو پایین",
    category: "overlays",
    Preview: () => (
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="outline">بازکردن کشو</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>کشوی نمونه</DrawerTitle>
            <DrawerDescription>
              برای بستن، پنل را به پایین بکش.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerClose asChild>
            <Button className="m-5">بستن</Button>
          </DrawerClose>
        </DrawerContent>
      </Drawer>
    ),
  },
  {
    name: "Popover",
    keywords: "پاپ اور محتوا",
    category: "overlays",
    Preview: () => (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">جزئیات کوتاه</Button>
        </PopoverTrigger>
        <PopoverContent className="space-y-2">
          <p className="font-semibold">زمان تمرین</p>
          <p className="text-sm text-muted-foreground">
            هر روز از ۸ صبح تا ۱۰ شب
          </p>
        </PopoverContent>
      </Popover>
    ),
  },
  {
    name: "Tooltip",
    keywords: "راهنما تولتیپ",
    category: "overlays",
    Preview: () => (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">مکث یا فوکوس کن</Button>
        </TooltipTrigger>
        <TooltipContent>راهنمای کوتاه برای این دکمه</TooltipContent>
      </Tooltip>
    ),
  },
  {
    name: "HoverCard",
    keywords: "کارت شناور",
    category: "overlays",
    Preview: () => (
      <HoverCard>
        <HoverCardTrigger asChild>
          <Button variant="link">باشگاه اطلس</Button>
        </HoverCardTrigger>
        <HoverCardContent>
          باشگاه نمونه در تهران؛ بدنسازی و تمرین گروهی.
        </HoverCardContent>
      </HoverCard>
    ),
  },
  {
    name: "PreviewLinkCard",
    keywords: "پیش نمایش لینک تصویر",
    category: "overlays",
    Preview: () => (
      <PreviewLinkCard
        href="/discovery"
        src="/images/clubs/strength.png"
        width={280}
        height={160}
      >
        <PreviewLinkCardTrigger className="text-primary underline">
          پیش‌نمایش باشگاه‌ها
        </PreviewLinkCardTrigger>
        <PreviewLinkCardPortal>
          <PreviewLinkCardContent className="overflow-hidden rounded-xl border bg-popover">
            <PreviewLinkCardImage alt="نمونهٔ باشگاه" />
          </PreviewLinkCardContent>
        </PreviewLinkCardPortal>
      </PreviewLinkCard>
    ),
  },
  {
    name: "DropdownMenu",
    keywords: "منو کشویی",
    category: "overlays",
    Preview: DropdownExample,
  },
  {
    name: "ContextMenu",
    keywords: "منو راست کلیک",
    category: "overlays",
    Preview: () => (
      <ContextMenu dir="rtl">
        <ContextMenuTrigger className="flex h-24 items-center justify-center rounded-xl border border-dashed text-sm">
          راست‌کلیک یا لمس طولانی کن
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={() => toast.info("نمایش نمونه")}>
            نمایش
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => toast.info("اشتراک نمونه")}>
            اشتراک
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    ),
  },
  {
    name: "Menubar",
    keywords: "نوار منو",
    category: "overlays",
    Preview: () => (
      <Menubar dir="rtl">
        <MenubarMenu>
          <MenubarTrigger>فایل</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onSelect={() => toast.info("فایل نمونه")}>
              جدید
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>نمایش</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onSelect={() => toast.info("تنظیمات نمونه")}>
              تنظیمات
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    ),
  },
  {
    name: "NavigationMenu",
    keywords: "ناوبری منو",
    category: "overlays",
    Preview: () => (
      <NavigationMenu dir="rtl">
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>کشف باشگاه</NavigationMenuTrigger>
            <NavigationMenuContent className="min-w-48 p-4">
              <NavigationMenuLink href="/discovery">
                دیدن باشگاه‌ها
              </NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    ),
  },
  {
    name: "Command",
    keywords: "فرمان جستجو",
    category: "overlays",
    Preview: () => (
      <Command className="rounded-xl border">
        <CommandInput placeholder="فرمان را جست‌وجو کن…" />
        <CommandList>
          <CommandEmpty>فرمانی پیدا نشد</CommandEmpty>
          <CommandGroup heading="نمونه‌ها">
            <CommandItem onSelect={() => toast.info("تمرین نمونه")}>
              تمرین جدید
            </CommandItem>
            <CommandItem onSelect={() => toast.info("رزرو نمونه")}>
              رزرو جلسه
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    ),
  },
  {
    name: "Sidebar",
    keywords: "نوار کناری ناوبری",
    category: "overlays",
    Preview: () => (
      <SidebarProvider className="min-h-0">
        <Sidebar collapsible="none" className="w-full rounded-xl border">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>ناوبری نمونه</SidebarGroupLabel>
              <SidebarMenu>
                {["خانه", "جلسه‌ها", "تنظیمات"].map((label, index) => (
                  <SidebarMenuItem key={label}>
                    <SidebarMenuButton
                      isActive={index === 0}
                      onClick={() => toast.info(label)}
                    >
                      {label}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    ),
  },
  {
    name: "Sileo / Sonner",
    keywords: "اعلان موفق خطا هشدار",
    category: "overlays",
    Preview: () => (
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => toast.success("عملیات نمونه موفق بود")}>
          موفق
        </Button>
        <Button
          variant="destructive"
          onClick={() => toast.error("یک خطای نمونه رخ داد")}
        >
          خطا
        </Button>
        <Button variant="outline" onClick={() => toast.warning("هشدار نمونه")}>
          هشدار
        </Button>
      </div>
    ),
  },
  {
    name: "Toast",
    keywords: "اعلان بیس یو آی",
    category: "overlays",
    Preview: () => (
      <Toast.Provider>
        <PrimitiveToastContent />
      </Toast.Provider>
    ),
  },
];
