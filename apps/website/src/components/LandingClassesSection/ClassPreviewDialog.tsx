"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { useTranslations } from "@repo/i18n";
import { ClassPoster } from "./ClassPoster";
import type { ClassSelection } from "./LandingClassesSection.types";
import styles from "./LandingClassesSection.module.css";

export function ClassPreviewDialog({
  selection,
  onDismiss,
  onRestore,
}: {
  selection: ClassSelection;
  reducedMotion: boolean;
  onDismiss: () => void;
  onRestore: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const restore = useEffectEvent(onRestore);
  const t = useTranslations("Website.classes");
  const fitness = useTranslations("Website.classes.fitness");
  useEffect(() => {
    const dialog = ref.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      restore();
      selection.trigger.focus({ preventScroll: true });
    };
  }, [selection]);
  return (
    <dialog
      ref={ref}
      className={styles.fitnessDialog}
      aria-label={selection.item.title}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onDismiss();
      }}
    >
      <div className={styles.fitnessDetail}>
        <button
          type="button"
          className={styles.detailClose}
          onClick={onDismiss}
        >
          {t("close")}
        </button>
        <ClassPoster item={selection.item} />
        <p>{selection.item.description}</p>
        <p className={styles.previewNote}>{fitness("previewNote")}</p>
        <a href="#download" className={styles.detailCta} onClick={onDismiss}>
          {fitness("exploreApp")}
        </a>
      </div>
    </dialog>
  );
}
