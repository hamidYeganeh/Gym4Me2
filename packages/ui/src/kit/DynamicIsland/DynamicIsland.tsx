"use client";
import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "@repo/i18n";
import { PauseIcon, PlayIcon, StopwatchIcon, ArrowRotateCounterclockwise1Icon } from "../../icons";

/* ══ Dynamic island ═══════════════════════════════════════
   A black pill at the top of a phone that holds a live
   activity. Press it and it grows into the full activity;
   press again and it tucks back into the pill. Which activity
   is running — a timer, a call, music or a flight — is set by the
   block: each is its own card on the wall, the same island under it.

   ── THE SHAPE IS ONE SPRING, THE CONTENT IS NOT ──────────
   Width, height and corner ride one spring, so the pill grows
   as one object and never as a box whose corners catch up
   later. The contents do not morph with it: the compact row
   and the expanded card are two different layouts, and
   stretching one into the other is the thing that looks
   cheap. They crossfade instead, through a small blur and a
   scale, the old one leaving a beat before the new one
   arrives — so for an instant there is only the black shape
   moving, which is what makes it read as the same object
   changing rather than as two panels swapped.

   ── CENTRED IN THE BLOCK ─────────────────────────────────
   On a phone it hangs from the top edge; here there is no
   phone around it, so it sits in the middle of the block and
   grows out evenly from there.

   The island is black whatever the Fill is — it is the screen
   switched off around a camera, not a surface of the app —
   unless the Island knob asks for white, which inverts its
   ink and deepens the colours that were tuned for black. */


// Workout adaptation: the clock is controlled by the session, never by animation frames.
// Only the timer activity is used; no unlicensed avatar or music-cover assets are needed.
export function DynamicIsland({ seconds, running, finished = false, label, onToggle, onReset, startOpen = true, bounce = 40 }: {
  seconds: number; running: boolean; finished?: boolean; label: string;
  onToggle: () => void; onReset: () => void; startOpen?: boolean; bounce?: number;
}) {
  const t = useTranslations("WorkoutTimer"), locale = useLocale(), id = useId();
  const still = useReducedMotion();
  const [open, setOpen] = useState(startOpen);
  const value = Math.max(0, Math.floor(seconds));
  const number = new Intl.NumberFormat(locale, { minimumIntegerDigits: 2, useGrouping: false });
  const clock = `${number.format(Math.floor(value / 60))}:${number.format(value % 60)}`;
  const b = Math.max(0, Math.min(100, bounce)) / 100;
  const spring = still ? { duration: 0 } : { type: "spring" as const, stiffness: 380, damping: 34 - b * 16, mass: 0.9 };
  return (
    <div className="dyn">
      <motion.div className="dyn-pill" initial={false}
        animate={{ width: open ? 340 : 170, height: open ? 88 : 44, borderRadius: open ? 44 : 22 }} transition={spring}>
        {/* Separate native buttons keep the expanded controls keyboard accessible without nested buttons. */}
        <button type="button" className="dyn-toggle" aria-expanded={open} aria-controls={id}
          aria-label={t(open ? "collapse" : "expand")} onClick={() => setOpen(!open)} />
        <AnimatePresence initial={false} mode="wait">
          <motion.div key={String(open)} id={id} className={open ? "dyn-open" : "dyn-compact"}
            initial={{ opacity: 0, scale: still ? 1 : 0.92, filter: still ? "none" : "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: still ? 1 : 0.92, filter: still ? "none" : "blur(6px)" }}
            transition={{ duration: still ? 0 : 0.22, delay: still ? 0 : 0.06 }}>
            {open ? <>
              <button type="button" className="dyn-round" onClick={onToggle} aria-label={t(running ? "pause" : finished ? "restart" : "start")}>
                {running ? <PauseIcon /> : <PlayIcon />}
              </button>
              <span className="dyn-readout"><span className="dyn-label">{finished ? t("finished") : label}</span>
                <span className="dyn-big" dir="ltr" role="timer" aria-label={label}>{clock}</span></span>
              <button type="button" className="dyn-reset" onClick={onReset} aria-label={t("reset")}><ArrowRotateCounterclockwise1Icon /></button>
            </> : <><StopwatchIcon /><span className="dyn-num" dir="ltr" role="timer" aria-label={label}>{clock}</span></>}
          </motion.div>
        </AnimatePresence>
      </motion.div>
      <span role="status" className="sr-only">{finished ? t("finished") : ""}</span>
    </div>
  );
}
