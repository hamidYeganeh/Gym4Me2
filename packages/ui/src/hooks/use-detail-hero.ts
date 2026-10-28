"use client";
import { useEffect, useRef, useState } from "react";

/** Keep scroll animation off React's render path and respect reduced motion. */
export function useDetailHero() {
  const heroRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const [heroPassed, setHeroPassed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = heroRef.current?.getBoundingClientRect();
      if (!rect) return;
      setScrolled(rect.top < -8);
      setHeroPassed(rect.bottom <= 88);
      if (imageRef.current)
        imageRef.current.style.transform = motion.matches
          ? "none"
          : `translate3d(0, ${Math.max(0, Math.min(-rect.top, rect.height)) * 0.25}px, 0) scale(1.08)`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    motion.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      motion.removeEventListener("change", schedule);
    };
  }, []);
  return { heroRef, imageRef, heroPassed, scrolled };
}
