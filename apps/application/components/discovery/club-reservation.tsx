"use client";
import { amount } from "../luma/common";
import { useAppClock } from "../luma/use-app-clock";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "@repo/i18n";
import { useSportsQuery, type ServiceDto } from "@repo/api/sports";
import { Button } from "@repo/ui/kit/Button";
import { ChevronLeftIcon, Calendar1Icon, ClockIcon } from "@repo/ui/icons";
import { useCatalogClub } from "./use-catalog";
import { useSelectedBranch } from "./use-selected-branch";
import { CatalogState } from "./catalog-state";
import { clubHref } from "../../lib/club-href";
import { storeCheckoutSelection } from "../../lib/checkout-selection";

export function ClubReservation({ clubId, initialClub }: { clubId: string; initialClub?: import("@repo/api/catalog").ClubDto }) {
  const locale = useLocale(),
    t = useTranslations("Slots"),
    router = useRouter();
  const now = useAppClock();
  const [branchId, setBranch] = useSelectedBranch(clubId);
  const catalog = useCatalogClub(clubId, branchId, initialClub);
  const list = useSportsQuery<ServiceDto[]>(
    "sports/services",
    { organizationId: catalog.data?.id, branchId: catalog.branch?.id },
    Boolean(catalog.branch),
  );
  const [serviceChoice, setService] = useState("");
  const [dayChoice, setDay] = useState("");
  const [slotChoice, setSlot] = useState("");
  const services = (list.data ?? []).filter((item) =>
    ["class", "course", "court", "access"].includes(item.kind),
  );
  const service =
    services.find((item) => item.id === serviceChoice) ?? services[0];
  const detail = useSportsQuery<ServiceDto>(
    `sports/services/${service?.publicId ?? ""}`,
    undefined,
    Boolean(service),
  );
  const dayKey = (value: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  const slots = (detail.data?.occurrences ?? []).filter(
    (slot) => new Date(slot.startAt).getTime() > now,
  );
  const days = [...new Set(slots.map((slot) => dayKey(slot.startAt)))];
  const day = days.includes(dayChoice) ? dayChoice : days[0];
  const daySlots = slots.filter((slot) => dayKey(slot.startAt) === day);
  const selected = daySlots.find(
    (slot) =>
      slot.id === slotChoice &&
      slot.remaining > 0 &&
      slot.resourceAvailable !== false,
  );
  const time = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tehran",
    }).format(new Date(value));
  if (!catalog.club)
    return (
      <CatalogState
        loading={catalog.isPending}
        retry={catalog.isError ? () => void catalog.refetch() : undefined}
      />
    );
  const active =
    catalog.data?.operatingStatus === "active" &&
    catalog.branch?.operatingStatus === "active";
  return (
    <main className="relative isolate mx-auto flex min-h-dvh w-full max-w-xl flex-col bg-background text-foreground">
      <div className="absolute inset-0 -z-20">
        <Image
          src={catalog.club.photos[0]!.src}
          alt=""
          fill
          sizes="576px"
          className="object-cover"
          unoptimized
          priority
        />
      </div>
      <div className="absolute inset-0 -z-10 bg-black/45" />
      <header className="px-5 pt-[calc(1rem+var(--app-safe-top,0px))]">
        <Button asChild variant="secondary" size="icon-lg">
          <Link href={clubHref(clubId)} aria-label={t("back")}>
            <ChevronLeftIcon className="rtl:rotate-180" />
          </Link>
        </Button>
      </header>
      <div className="flex min-h-[32svh] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        <p className="text-sm">{catalog.club.name}</p>
        <h1 className="text-5xl font-bold tracking-tight">{t("title")}</h1>
      </div>
      <div
        className="mb-3 flex gap-2 overflow-x-auto px-5 pb-1"
        role="group"
        aria-label={catalog.club.name}
      >
        {catalog.data?.branches.map((branch) => (
          <button
            key={branch.id}
            type="button"
            aria-pressed={branch.id === catalog.branch?.id}
            onClick={() => {
              setBranch(branch.id);
              setService("");
              setDay("");
              setSlot("");
            }}
            className="shrink-0 rounded-full bg-secondary px-5 py-3 text-sm text-secondary-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          >
            {branch.name}
          </button>
        ))}
      </div>
      <section className="mx-3 mb-[calc(1rem+var(--app-safe-bottom,0px))] flex flex-col gap-6 rounded-[2rem] bg-card p-5 text-card-foreground sm:mx-5 sm:p-6">
        {(list.isPending || (detail.isPending && service)) && (
          <CatalogState loading />
        )}
        {(list.isError || detail.isError) && (
          <CatalogState
            retry={() => {
              void list.refetch();
              void detail.refetch();
            }}
          />
        )}
        {services.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {services.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={service?.id === item.id}
                onClick={() => {
                  setService(item.id);
                  setDay("");
                  setSlot("");
                }}
                className="shrink-0 rounded-full border border-border px-4 py-2 text-sm aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                {item.title}
              </button>
            ))}
          </div>
        )}
        {service && (
          <>
            <fieldset className="min-w-0">
              <legend className="mb-3 flex items-center gap-2 text-sm">
                <Calendar1Icon />
                {t("date")}
              </legend>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {days.map((value) => {
                  const date = new Date(`${value}T12:00:00Z`);
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={day === value}
                      onClick={() => {
                        setDay(value);
                        setSlot("");
                      }}
                      className="flex min-w-[72px] flex-1 flex-col items-center gap-2 rounded-2xl border-2 border-transparent bg-muted px-3 py-4 aria-pressed:border-primary"
                      aria-label={new Intl.DateTimeFormat(locale, {
                        dateStyle: "full",
                      }).format(date)}
                    >
                      <span className="text-3xl">
                        {new Intl.DateTimeFormat(locale, {
                          day: "numeric",
                        }).format(date)}
                      </span>
                      <span className="text-xs">
                        {new Intl.DateTimeFormat(locale, {
                          weekday: "short",
                        }).format(date)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-3 flex items-center gap-2 text-sm">
                <ClockIcon />
                {t("time")}
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {daySlots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={
                      !active ||
                      slot.remaining <= 0 ||
                      slot.resourceAvailable === false
                    }
                    aria-pressed={selected?.id === slot.id}
                    onClick={() => setSlot(slot.id)}
                    className="rounded-xl border border-transparent bg-muted px-3 py-4 text-sm tabular-nums aria-pressed:border-primary disabled:opacity-35"
                    dir="ltr"
                  >
                    {time(slot.startAt)} – {time(slot.endAt)}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}
        {!list.isPending && !detail.isPending && !days.length && (
          <p className="py-5 text-center text-sm">{t("unavailable")}</p>
        )}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">{t("price")}</p>
            <p className="text-xl font-semibold">
              {service
                ? `${amount(service.amountMinor, locale)} ${catalog.club.priceCurrency}`
                : "-"}
            </p>
          </div>
          {active && (
            <Button
              disabled={!selected || !service || detail.isFetching || list.isFetching || catalog.branchQuery.isFetching}
              className="h-12 min-w-36 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                if (!selected || !service) return;
                storeCheckoutSelection(service.publicId, selected.id);
                router.push("/checkout");
              }}
            >
              {t("book")}
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}
