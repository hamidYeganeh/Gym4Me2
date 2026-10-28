"use client";
import { Search as SearchInput } from "@repo/ui/kit/Search";
import { IconPicker } from "@repo/ui/kit/IconPicker";
import { RollingCounter } from "@repo/ui/kit/RollingCounter";

import { Button } from "@repo/ui/kit/Button";
import { Calendar } from "@repo/ui/kit/Calendar";
import { Checkbox } from "@repo/ui/kit/Checkbox";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@repo/ui/kit/Combobox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@repo/ui/kit/Field";
import { Input } from "@repo/ui/kit/Input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@repo/ui/kit/InputOtp";
import {
  IranianDateInput,
  IranianDateTimeInput,
} from "@repo/ui/kit/IranianDateInput";
import { Label } from "@repo/ui/kit/Label";
import { NativeSelect, NativeSelectOption } from "@repo/ui/kit/NativeSelect";
import { OneTimeCode, type OneTimeCodeProps } from "@repo/ui/kit/OneTimeCode";
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@repo/ui/kit/Questionnaire";
import { RadioGroup, RadioGroupItem } from "@repo/ui/kit/RadioGroup";
import { ScheduleCalendar } from "@repo/ui/kit/ScheduleCalendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/kit/Select";
import { toast } from "@repo/ui/kit/Sileo";
import { Slider } from "@repo/ui/kit/Slider";
import { SmoothInput } from "@repo/ui/kit/SmoothInput";
import { Switch } from "@repo/ui/kit/Switch";
import { TextField } from "@repo/ui/kit/TextField";
import { Textarea } from "@repo/ui/kit/Textarea";
import { Toggle } from "@repo/ui/kit/Toggle";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/kit/ToggleGroup";
import { useState } from "react";
import type { DemoExample } from "./types";

function IconPickerExample() {
  const [icon, setIcon] = useState<string | null>("BarbellHorizontalIcon");
  return <IconPicker value={icon} onChange={setIcon} />;
}

function Buttons() {
  const [count, setCount] = useState(0);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {(
        [
          "default",
          "secondary",
          "outline",
          "ghost",
          "destructive",
          "link",
        ] as const
      ).map((variant) => (
        <Button
          key={variant}
          variant={variant}
          onClick={() => toast.info(variant)}
        >
          {variant}
        </Button>
      ))}
      <Button disabled>غیرفعال</Button>
      <RollingCounter value={count} onValueChange={setCount} label="شمارنده" />
    </div>
  );
}

function OtpExample() {
  const [code, setCode] = useState("");
  const [status, setStatus] =
    useState<NonNullable<OneTimeCodeProps["status"]>>("idle");
  return (
    <div className="space-y-4">
      <OneTimeCode
        aria-label="کد یک‌بارمصرف دمو"
        value={code}
        onValueChange={(value) => {
          setCode(value);
          setStatus("idle");
        }}
        status={status}
        verifiedLabel="تأیید شد"
      />
      <div className="flex flex-wrap gap-2">
        {(["idle", "verifying", "success", "error"] as const).map(
          (value, index) => (
            <Button
              key={value}
              size="sm"
              variant="outline"
              onClick={() => {
                setCode(value === "idle" ? "" : "12345");
                setStatus(value);
              }}
            >
              {["بازنشانی", "بررسی", "موفق", "خطا"][index]}
            </Button>
          ),
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        حالت‌های نمایشی؛ هیچ کدی ارسال یا تأیید نمی‌شود.
      </p>
    </div>
  );
}

function SliderExample() {
  const [value, setValue] = useState([40]);
  return (
    <div className="space-y-4">
      <Slider
        aria-label="شدت تمرین"
        value={value}
        onValueChange={setValue}
        max={100}
        step={5}
      />
      <output className="text-sm">شدت تمرین: {value[0]}٪</output>
    </div>
  );
}

function DateExample() {
  const [date, setDate] = useState("2026-10-28");
  const [month, setMonth] = useState(date);
  return (
    <ScheduleCalendar
      title="تقویم جلسات"
      today="2026-10-28"
      month={month}
      onMonthChange={setMonth}
      selected={date}
      onSelect={(day) => setDate(day ?? "2026-10-28")}
    >
      <p className="text-sm" dir="ltr">
        {date}
      </p>
    </ScheduleCalendar>
  );
}

function CalendarExample() {
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 9, 28));
  return (
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      defaultMonth={new Date(2026, 9, 1)}
      className="mx-auto max-w-full"
    />
  );
}

function QuestionnaireExample() {
  return (
    <Questionnaire
      onSubmit={(event) => {
        event.preventDefault();
        toast.success("پاسخ‌های نمونه ثبت شدند");
      }}
    >
      <QuestionnaireItem name="goal" required>
        <QuestionnaireTitle>هدفت از تمرین چیه؟</QuestionnaireTitle>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="strength">
            افزایش قدرت
          </QuestionnaireChoice>
          <QuestionnaireChoice value="fitness">تناسب اندام</QuestionnaireChoice>
        </QuestionnaireChoices>
      </QuestionnaireItem>
      <QuestionnaireItem name="level" required>
        <QuestionnaireTitle>سطح تمرینت چقدره؟</QuestionnaireTitle>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="beginner">تازه‌کار</QuestionnaireChoice>
          <QuestionnaireChoice value="advanced">حرفه‌ای</QuestionnaireChoice>
        </QuestionnaireChoices>
      </QuestionnaireItem>
      <QuestionnaireActions>
        <QuestionnairePrevious>قبلی</QuestionnairePrevious>
        <QuestionnaireNext>بعدی</QuestionnaireNext>
        <QuestionnaireSubmit>ثبت نمونه</QuestionnaireSubmit>
      </QuestionnaireActions>
    </Questionnaire>
  );
}

const cities = ["تهران", "شیراز", "اصفهان"];

export const controlExamples: DemoExample[] = [
  {
    name: "Button / ButtonGroup",
    keywords: "دکمه گروه اندازه حالت",
    category: "controls",
    Preview: Buttons,
  },
  {
    name: "Input / Label",
    keywords: "ورودی متن برچسب",
    category: "controls",
    Preview: () => (
      <div className="space-y-3">
        <Label htmlFor="demo-input">نام</Label>
        <Input id="demo-input" placeholder="نام خودت را بنویس" />
        <Input aria-label="ورودی غیرفعال" disabled placeholder="غیرفعال" />
        <Input
          aria-label="ورودی دارای خطا"
          aria-invalid
          defaultValue="مقدار نامعتبر"
        />
      </div>
    ),
  },
  {
    name: "SmoothInput",
    keywords: "ورودی نشانگر نرم",
    category: "controls",
    Preview: () => (
      <SmoothInput
        aria-label="ورودی با نشانگر نرم"
        dir="ltr"
        placeholder="Type something…"
      />
    ),
  },
  {
    name: "TextField",
    keywords: "فیلد اعتبارسنجی خطا",
    category: "controls",
    Preview: () => (
      <form onSubmit={(event) => event.preventDefault()} className="space-y-4">
        <TextField
          label="نام نمایشی"
          description="حداقل سه حرف وارد کن و از فیلد خارج شو."
          name="demo-name"
          required
          validate={(value) =>
            String(value).length < 3 ? "حداقل سه حرف لازم است." : null
          }
          validationMode="onBlur"
        />
        <TextField
          label="نمونهٔ خطا"
          error="این نام قبلاً استفاده شده."
          defaultValue="gym4me"
        />
      </form>
    ),
  },
  {
    name: "Textarea",
    keywords: "متن چندخطی توضیحات",
    category: "controls",
    Preview: () => (
      <Textarea aria-label="یادداشت تمرین" placeholder="یادداشت تمرین امروز…" />
    ),
  },
  {
    name: "Field",
    keywords: "فرم توضیحات خطا",
    category: "controls",
    Preview: () => (
      <Field data-invalid>
        <FieldLabel htmlFor="demo-field">ایمیل</FieldLabel>
        <Input
          id="demo-field"
          type="email"
          defaultValue="invalid"
          aria-invalid
          aria-describedby="demo-field-hint demo-field-error"
        />
        <FieldDescription id="demo-field-hint">
          برای دریافت رسید استفاده می‌شود.
        </FieldDescription>
        <FieldError id="demo-field-error">یک ایمیل معتبر وارد کن.</FieldError>
      </Field>
    ),
  },
  {
    name: "InputGroup",
    keywords: "جستجو ورودی گروه",
    category: "controls",
    Preview: () => (
      <SearchInput aria-label="جست‌وجوی باشگاه" placeholder="نام باشگاه…" />
    ),
  },
  {
    name: "Checkbox",
    keywords: "چک باکس انتخاب",
    category: "controls",
    Preview: () => (
      <div className="flex items-center gap-3">
        <Checkbox id="demo-checkbox" defaultChecked />
        <Label htmlFor="demo-checkbox">شرایط نمونه را می‌پذیرم</Label>
      </div>
    ),
  },
  {
    name: "Switch",
    keywords: "سوییچ روشن خاموش",
    category: "controls",
    Preview: () => (
      <div className="flex items-center gap-3">
        <Switch id="demo-switch" defaultChecked />
        <Label htmlFor="demo-switch">یادآوری تمرین</Label>
      </div>
    ),
  },
  {
    name: "RadioGroup",
    keywords: "رادیو انتخاب تکی",
    category: "controls",
    Preview: () => (
      <RadioGroup defaultValue="monthly" aria-label="نوع عضویت">
        <div className="flex items-center gap-3">
          <RadioGroupItem value="monthly" id="demo-monthly" />
          <Label htmlFor="demo-monthly">ماهانه</Label>
        </div>
        <div className="flex items-center gap-3">
          <RadioGroupItem value="yearly" id="demo-yearly" />
          <Label htmlFor="demo-yearly">سالانه</Label>
        </div>
      </RadioGroup>
    ),
  },
  {
    name: "Toggle / ToggleGroup",
    keywords: "دکمه انتخاب چندتایی",
    category: "controls",
    Preview: () => (
      <div className="flex flex-wrap gap-3">
        <Toggle aria-label="علاقه‌مندی">علاقه‌مندی</Toggle>
        <ToggleGroup
          type="multiple"
          defaultValue={["gym"]}
          aria-label="رشته‌ها"
        >
          <ToggleGroupItem value="gym">بدنسازی</ToggleGroupItem>
          <ToggleGroupItem value="yoga">یوگا</ToggleGroupItem>
          <ToggleGroupItem value="swim">شنا</ToggleGroupItem>
        </ToggleGroup>
      </div>
    ),
  },
  {
    name: "Slider",
    keywords: "اسلایدر محدوده",
    category: "controls",
    Preview: SliderExample,
  },
  {
    name: "Select",
    keywords: "انتخاب فهرست شهر",
    category: "controls",
    Preview: () => (
      <Select defaultValue="تهران" dir="rtl">
        <SelectTrigger aria-label="شهر" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {cities.map((city) => (
            <SelectItem key={city} value={city}>
              {city}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ),
  },
  {
    name: "NativeSelect",
    keywords: "انتخاب بومی مرورگر",
    category: "controls",
    Preview: () => (
      <NativeSelect aria-label="شهر بومی" defaultValue="تهران">
        {cities.map((city) => (
          <NativeSelectOption key={city} value={city}>
            {city}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    ),
  },
  {
    name: "Combobox",
    keywords: "جستجو انتخاب شهر",
    category: "controls",
    Preview: () => (
      <Combobox items={cities}>
        <ComboboxInput
          aria-label="جست‌وجو و انتخاب شهر"
          placeholder="شهر را جست‌وجو کن"
          showClear
        />
        <ComboboxContent>
          <ComboboxEmpty>نتیجه‌ای پیدا نشد</ComboboxEmpty>
          <ComboboxList>
            {(city: string) => (
              <ComboboxItem key={city} value={city}>
                {city}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    ),
  },
  {
    name: "InputOtp",
    keywords: "رمز یکبار مصرف کد",
    category: "controls",
    Preview: () => (
      <div dir="ltr">
        <InputOTP maxLength={5} aria-label="کد پنج رقمی">
          <InputOTPGroup>
            {Array.from({ length: 5 }, (_, index) => (
              <InputOTPSlot key={index} index={index} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
    ),
  },
  {
    name: "OneTimeCode",
    keywords: "رمز کد تایید موفق خطا",
    category: "controls",
    Preview: OtpExample,
  },
  {
    name: "IranianDateInput",
    keywords: "تاریخ شمسی جلالی",
    category: "controls",
    Preview: () => (
      <div className="space-y-2">
        <Label htmlFor="demo-iranian-date">تاریخ</Label>
        <IranianDateInput id="demo-iranian-date" defaultValue="2026-10-28" />
      </div>
    ),
  },
  {
    name: "IranianDateTimeInput",
    keywords: "تاریخ ساعت شمسی",
    category: "controls",
    Preview: () => (
      <div className="space-y-2">
        <Label htmlFor="demo-date-time">زمان جلسه</Label>
        <IranianDateTimeInput
          id="demo-date-time"
          defaultValue="2026-10-28T10:30"
        />
      </div>
    ),
  },
  {
    name: "Calendar",
    keywords: "تقویم میلادی",
    category: "controls",
    Preview: CalendarExample,
  },
  {
    name: "ScheduleCalendar",
    keywords: "تقویم جلسات شمسی",
    category: "controls",
    Preview: DateExample,
  },
  {
    name: "Search",
    title: "جست‌وجوی بازشونده",
    keywords: "search جستجو جست‌وجو بنچو",
    category: "controls",
    Preview: () => (
      <SearchInput
        expanded={false}
        aria-label="جست‌وجوی نمونه"
        placeholder="جست‌وجو…"
      />
    ),
  },
  {
    name: "Questionnaire",
    keywords: "پرسشنامه چندمرحله سوال",
    category: "controls",
    Preview: QuestionnaireExample,
  },
  {
    name: "IconPicker",
    title: "انتخاب آیکون سندو",
    keywords: "admin icon font sandow آیکون مدیریت",
    category: "controls",
    Preview: IconPickerExample,
  },
];
