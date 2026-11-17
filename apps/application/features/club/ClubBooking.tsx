"use client";

import Image from "next/image";
import { useState } from "react";

import type { FitnessClub } from "./clubs";

import { useLocale, useTranslations } from "@repo/i18n";
import { AnimatedButton } from "@repo/ui/kit/button";
import { Input } from "@repo/ui/kit/input";
import {
  AnimatedSheet,
  AnimatedSheetContent,
  AnimatedSheetDescription,
  AnimatedSheetTitle,
} from "@repo/ui/kit/sheet";
import { Textarea } from "@repo/ui/kit/textarea";

import styles from "./booking.module.css";
import ClubIcon from "./ClubIcon";
import ClubServices, { useMoney, useSessions } from "./ClubServices";

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
const ClubBooking = (props: { club: FitnessClub; initial: string[]; onClose: () => void }) => {
  const t = useTranslations("Club");
  const { club, initial, onClose } = props;
  const titles = [
    t("selectSessions"),
    t("selectDateAndTime"),
    t("yourFirstVisit"),
    t("reviewAndContinue"),
    t("reviewAndConfirm"),
    t("yourVisitPreview"),
  ];

  const sessions = useSessions();
  const money = useMoney();
  const locale = useLocale();
  const localTime = (value: string) =>
    value.replace(/\d+/g, (part) =>
      Number(part).toLocaleString(locale, { minimumIntegerDigits: 2, useGrouping: false }),
    );
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(initial);
  const [today] = useState(() => localDate(new Date()));
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
  const [first, setFirst] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState("club");
  const items = sessions.filter((item) => selected.includes(item.id));
  const total = items.reduce((sum, item) => sum + item.price, 0);
  const duration = items.reduce((sum, item) => sum + item.minutes, 0);
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() + i);
    return d;
  });
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const valid =
    step === 0 ? items.length > 0
    : step === 1 ? !!time && date >= today
    : step === 2 ? first !== null
    : true;
  return (
    <AnimatedSheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AnimatedSheetContent side="bottom" className={styles.sheet}>
        <header className={styles.header}>
          <AnimatedButton
            iconOnly
            radius="full"
            color="secondary"
            aria-label={step ? t("previousStep") : t("backToClub")}
            onClick={() => (step ? setStep(step - 1) : onClose())}
          >
            <ClubIcon name="back" />
          </AnimatedButton>
          <span>{t("bookingPreview")}</span>
          <AnimatedButton
            iconOnly
            radius="full"
            color="secondary"
            aria-label={t("closeBooking")}
            onClick={onClose}
          >
            <ClubIcon name="close" />
          </AnimatedButton>
        </header>
        <div className={styles.body} key={step}>
          <AnimatedSheetTitle className={styles.title}>{titles[step]}</AnimatedSheetTitle>
          <AnimatedSheetDescription>
            {t("previewOnly", { name: club.name })}
          </AnimatedSheetDescription>
          {step === 0 && (
            <ClubServices
              booking
              selected={selected}
              onSelect={(id) => {
                setSelected((old) =>
                  old.includes(id) ? old.filter((x) => x !== id) : [...old, id],
                );
                setTime("");
              }}
            />
          )}
          {step === 1 && (
            <>
              <h2>{t("selectADate")}</h2>
              <div className={styles.dates}>
                {days.map((day) => (
                  <button
                    key={localDate(day)}
                    className={date === localDate(day) ? styles.activeDate : ""}
                    aria-pressed={date === localDate(day)}
                    onClick={() => {
                      setDate(localDate(day));
                      setTime("");
                    }}
                  >
                    <span>{day.toLocaleDateString(locale, { weekday: "short" })}</span>
                    <strong>{day.toLocaleDateString(locale, { day: "numeric" })}</strong>
                    <span>{day.toLocaleDateString(locale, { month: "short" })}</span>
                  </button>
                ))}
              </div>
              <label className={styles.field}>
                {t("chooseAnotherDate")}
                <Input
                  type="date"
                  min={today}
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setTime("");
                  }}
                />
              </label>
              <h2>{t("pickATime")}</h2>
              <p className={styles.muted}>{t("exampleTimes", { count: duration })}</p>
              {["08:00", "10:00", "14:00", "17:00", "19:00"]
                .filter((slot) => date !== today || slot > new Date().toTimeString().slice(0, 5))
                .map((slot) => (
                  <button
                    key={slot}
                    className={`${styles.time} ${time === slot ? styles.selected : ""}`}
                    aria-pressed={time === slot}
                    onClick={() => setTime(slot)}
                  >
                    {localTime(slot)}
                    {time === slot && <ClubIcon name="check" width={18} height={18} />}
                  </button>
                ))}
              <p className={styles.muted}>{t("needAnotherTimeChooseADifferentDate")}</p>
            </>
          )}
          {step === 2 && (
            <>
              <h2>{t("firstQuestion", { name: club.name })}</h2>
              {[true, false].map((value) => (
                <button
                  key={String(value)}
                  className={`${styles.time} ${first === value ? styles.selected : ""}`}
                  aria-pressed={first === value}
                  onClick={() => setFirst(value)}
                >
                  <span>
                    {value ? t("yes") : t("no")}
                    <small>{value ? t("thisIsMyFirstVisit") : t("iveTrainedHereBefore")}</small>
                  </span>
                  {first === value && <ClubIcon name="check" width={18} height={18} />}
                </button>
              ))}
            </>
          )}
          {step === 3 && (
            <>
              <div className={styles.card}>
                <div className={styles.clubSummary}>
                  <Image src={club.photos[0]!.src} alt="" width={64} height={64} unoptimized />
                  <div>
                    <h3>{club.name}</h3>
                    <p className={styles.muted}>{club.neighborhood}</p>
                  </div>
                </div>
                <hr />
                <p>{dateLabel}</p>
                <p>
                  {localTime(time)} · {t("minutes", { count: duration })}
                </p>
                <hr />
                {items.map((item) => (
                  <div className={styles.row} key={item.id}>
                    <span>
                      {item.name}
                      <small>{t("minutes", { count: item.minutes })}</small>
                    </span>
                    <strong>{money(item.price)}</strong>
                  </div>
                ))}
                <hr />
                <div className={styles.row}>
                  <strong>{t("total")}</strong>
                  <strong>{money(total)}</strong>
                </div>
              </div>
              <h2>{t("moreDetails")}</h2>
              <div className={styles.card}>
                <h3>{t("cancellationPolicy")}</h3>
                <p>
                  {t(
                    "confirmCancellationTermsAndCurrentPricesWithTheClubBeforeBookingThisPreviewDoesNotReserveAPlace",
                  )}
                </p>
              </div>
              <label className={styles.field}>
                {t("commentsOrRequests")}
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("tellTheCoachAboutYourGoalsOrAnythingYouNeedForYourVisit")}
                  maxLength={1000}
                />
              </label>
            </>
          )}
          {step === 4 && (
            <>
              <div className={styles.card}>
                <h3>{t("paymentPreference")}</h3>
                {[
                  {
                    id: "club",
                    label: t("payAtTheClub"),
                    detail: t("confirmTheFinalPriceAtReception"),
                  },
                  { id: "online", label: t("payOnline"), detail: t("notAvailableYet") },
                ].map((option) => (
                  <label className={styles.payment} key={option.id}>
                    <span>
                      {option.label}
                      <small>{option.detail}</small>
                    </span>
                    <input
                      type="radio"
                      name="payment"
                      value={option.id}
                      checked={payment === option.id}
                      disabled={option.id === "online"}
                      onChange={() => setPayment(option.id)}
                    />
                  </label>
                ))}
              </div>
              <div className={styles.card}>
                <h3>{t("beforeYouVisit")}</h3>
                <p>
                  {t("bringIndoorTrainersAWaterBottleAndATowel")}{" "}
                  {first ?
                    t("startAtReceptionForAnIntroductionToTheClub")
                  : t("checkInAtReceptionBeforeYourSession")}
                </p>
              </div>
              <p className={styles.muted}>
                {t(
                  "completeThePreviewToSeeYourVisitSummaryContactTheClubToMakeAnActualReservation",
                )}
              </p>
            </>
          )}
          {step === 5 && (
            <>
              <div className={styles.success}>
                <ClubIcon name="check" />
                <h2>{t("visitPreviewComplete")}</h2>
                <p>{t("noBookingHasBeenMade")}</p>
              </div>
              <div className={styles.card}>
                <h2>
                  {dateLabel}
                  <br />
                  {t("atTime", { time: localTime(time) })}
                </h2>
                <p>
                  {t("minutes", { count: duration })} · {money(total)}
                </p>
                <hr />
                {items.map((item) => (
                  <p key={item.id}>{item.name}</p>
                ))}
                {notes && (
                  <>
                    <hr />
                    <h3>{t("yourRequest")}</h3>
                    <p>{notes}</p>
                  </>
                )}
              </div>
              <AnimatedButton asChild variant="outlined" color="neutral" radius="full">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(club.neighborhood)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("exploreTheNeighbourhood")}
                  <ClubIcon name="arrow" />
                </a>
              </AnimatedButton>
            </>
          )}
        </div>
        <footer className={styles.bottom}>
          <div>
            <strong>{money(total)}</strong>
            <small>{t("sessionSummary", { count: items.length, minutes: duration })}</small>
          </div>
          <AnimatedButton
            size="xl"
            color="neutral"
            radius="full"
            disabled={!valid}
            onClick={() => (step === 5 ? onClose() : setStep(step + 1))}
          >
            {step === 5 ?
              t("backToClub")
            : step === 4 ?
              t("completePreview")
            : t("continue")}
            <ClubIcon name="arrow" />
          </AnimatedButton>
        </footer>
      </AnimatedSheetContent>
    </AnimatedSheet>
  );
};

export default ClubBooking;
