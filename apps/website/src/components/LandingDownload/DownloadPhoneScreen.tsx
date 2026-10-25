"use client";

import Image from "next/image";
import {
  House1Icon,
  CompassIcon,
  ChatIcon,
  BarbellHorizontalIcon,
} from "@repo/ui/icons";
import { useLocale, useTranslations, useFormatter } from "@repo/i18n";
import { getLandingClasses } from "../LandingClassesSection/LandingClassesSection.data";
import styles from "./DownloadPhoneScreen.module.css";

/** A localized, decorative preview using the application's typography and surfaces. */
export function DownloadPhoneScreen({
  scene,
}: {
  scene: "discover" | "class" | "schedule";
}) {
  const t = useTranslations("Website.download.phone");
  const preview = useTranslations("Preview");
  const app = useTranslations();
  const f = useFormatter();
  const classes = getLandingClasses(useLocale());
  const current = classes[2]!;
  return (
    <div className={styles.screen}>
      <div className={styles.status}>
        <span>{t("time", { hour: f.number(9), minute: f.number(41) })}</span>
        <span aria-hidden="true">● ▰</span>
      </div>
      <div className={styles.greeting}>
        <strong>{t("greeting")}</strong>
        <h3>{scene === "discover" ? t("tagline") : t(scene)}</h3>
      </div>
      {scene === "discover" ? (
        <>
          <div className={styles.search}>{t("search")}</div>
          <div className={styles.sectionHeading}>
            <h4>{t("nearby")}</h4>
            <small>{t("seeAll")}</small>
          </div>
          <div className={styles.clubHero}>
            <Image
              src="/images/clubs/strength.webp"
              alt=""
              fill
              sizes="232px"
              unoptimized
            />
            <div>
              <strong>{preview("atlasAthleticClub")}</strong>
              <small>{preview("zaferaniehTehran")}</small>
            </div>
          </div>
          <h4>{t("class")}</h4>
          <div className={styles.recommend}>
            <Image
              src="/images/clubs/training.webp"
              alt=""
              width={40}
              height={40}
            />
            <div>
              <strong>{current.title}</strong>
              <small>
                {current.coachName} ·{" "}
                {t("duration", { count: f.number(current.minutes) })}
              </small>
            </div>
          </div>
        </>
      ) : scene === "class" ? (
        <>
          <div className={styles.productPhoto}>
            <Image
              src={current.photo!.src}
              alt=""
              fill
              sizes="232px"
              unoptimized
            />
          </div>
          <div className={styles.product}>
            <span className={styles.level}>{current.level}</span>
            <h3>{current.title}</h3>
            <p>{current.coachName}</p>
            <div className={styles.metrics}>
              <span>
                <strong>{f.number(current.calories)}</strong>
                <small>{app("Website.classes.fitness.calories")}</small>
              </span>
              <span>
                <strong>{f.number(current.minutes)}</strong>
                <small>{app("Website.classes.fitness.minutes")}</small>
              </span>
              <span>
                <strong>{f.number(current.score)}</strong>
                <small>{app("Website.classes.fitness.score")}</small>
              </span>
            </div>
            <div className={styles.order}>{t("classCta")}</div>
          </div>
        </>
      ) : (
        <>
          <div className={styles.dayStrip}>
            {[16, 17, 18, 19, 20].map((day, index) => (
              <span key={day} data-active={index === 2}>
                {f.number(day)}
              </span>
            ))}
          </div>
          <div className={styles.sectionHeading}>
            <h4>{t("today")}</h4>
            <small>{t("confirmed")}</small>
          </div>
          <div className={styles.agenda}>
            <span>
              {t("time", {
                hour: f.number(18),
                minute: f.number(30, { minimumIntegerDigits: 2 }),
              })}
            </span>
            <div>
              <strong>{current.title}</strong>
              <small>{current.coachName}</small>
              <small>{preview("atlasAthleticClub")}</small>
            </div>
          </div>
          <h4>{t("next")}</h4>
          <div className={styles.workout}>
            <BarbellHorizontalIcon />
            <strong>{classes[0]!.title}</strong>
            <small>{t("duration", { count: f.number(45) })}</small>
            <div className={styles.order}>{t("start")}</div>
          </div>
        </>
      )}
      <div className={styles.dock}>
        <span data-active={scene === "schedule"}>
          <House1Icon />
          <small>{app("LumaDesign.schedule")}</small>
        </span>
        <span data-active={scene !== "schedule"}>
          <CompassIcon />
          <small>{app("Luma.discover")}</small>
        </span>
        <span>
          <ChatIcon />
          <small>{app("Luma.messages")}</small>
        </span>
      </div>
    </div>
  );
}
