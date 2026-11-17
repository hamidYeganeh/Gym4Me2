"use client";

import { useState } from "react";

import { useLocale, useTranslations } from "@repo/i18n";
import { AnimatedButton } from "@repo/ui/kit/button";

import styles from "./booking.module.css";
import ClubIcon from "./ClubIcon";

export const useSessions = () => {
  const t = useTranslations("Club");
  return [
    {
      id: "floor",
      name: t("openGymSession"),
      category: t("gymAccess"),
      minutes: 90,
      price: 250000,
      description: t("trainAtYourOwnPaceWithAccessToTheStrengthFloorAndCardioZone"),
    },
    {
      id: "coach",
      name: t("personalTraining"),
      category: t("coaching"),
      minutes: 60,
      price: 650000,
      description: t("onetooneCoachingFocusedOnYourTechniqueConfidenceAndGoals"),
    },
    {
      id: "functional",
      name: t("functionalStrength"),
      category: t("groupClasses"),
      minutes: 45,
      price: 300000,
      description: t("aFullbodyGroupSessionWithScalableStrengthAndConditioningExercises"),
    },
    {
      id: "intro",
      name: t("firstvisitIntroduction"),
      category: t("coaching"),
      minutes: 30,
      price: 0,
      description: t("meetTheTeamExploreTheEquipmentAndFindYourStartingPoint"),
    },
  ];
};
export const useMoney = () => {
  const t = useTranslations("Club");
  const locale = useLocale();
  return (value: number) =>
    value === 0 ? t("free") : t("price", { amount: value.toLocaleString(locale) });
};

const ClubServices = (props: {
  selected?: string[];
  onSelect: (id: string) => void;
  booking?: boolean;
}) => {
  const t = useTranslations("Club");
  const { selected = [], onSelect, booking = false } = props;
  const sessions = useSessions();
  const money = useMoney();
  const [category, setCategory] = useState(t("featured"));
  return (
    <section id={booking ? undefined : "club-services"} className={styles.services}>
      {!booking && <h2>{t("sessionsClasses")}</h2>}
      <div className={styles.categories} aria-label={t("sessionCategories")}>
        {[t("featured"), t("gymAccess"), t("coaching"), t("groupClasses")].map((item) => (
          <AnimatedButton
            key={item}
            radius="full"
            color={category === item ? "neutral" : "secondary"}
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
          >
            {item}
          </AnimatedButton>
        ))}
      </div>
      {!booking && <p className={styles.muted}>{t("sampleSessionsAndPrices")}</p>}
      {sessions
        .filter((item) => category === t("featured") || item.category === category)
        .map((item) => (
          <div
            key={item.id}
            className={`${styles.card} ${selected.includes(item.id) ? styles.selected : ""}`}
          >
            <h3>{item.name}</h3>
            <p className={styles.muted}>{t("minutes", { count: item.minutes })}</p>
            {booking && <p className={styles.muted}>{item.description}</p>}
            <div className={styles.row}>
              <strong>{money(item.price)}</strong>
              <AnimatedButton
                radius="full"
                color={selected.includes(item.id) ? "primary" : "neutral"}
                variant={selected.includes(item.id) ? "contained" : "outlined"}
                aria-label={t(selected.includes(item.id) ? "removeSession" : "selectSession", {
                  name: item.name,
                })}
                aria-pressed={booking ? selected.includes(item.id) : undefined}
                onClick={() => onSelect(item.id)}
              >
                {booking ?
                  selected.includes(item.id) ?
                    <ClubIcon name="check" width={18} height={18} />
                  : <ClubIcon name="plus" width={18} height={18} />
                : t("book")}
              </AnimatedButton>
            </div>
          </div>
        ))}
    </section>
  );
};

export default ClubServices;
