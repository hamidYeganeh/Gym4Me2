import { cva } from "class-variance-authority";
import { clubDetailStyles } from "../ClubDetail/ClubDetail.styles";

export const coachDetailStyles = {
  root: clubDetailStyles.root,
  hero: cva("relative isolate flex h-[min(56svh,480px)] min-h-[320px] flex-col overflow-hidden bg-image-surface text-white"),
  image: clubDetailStyles.image,
  nav: cva(
    "relative z-20 flex items-center justify-between px-5 pt-[calc(1rem+var(--app-safe-top,0px))] [&>a]:size-11 [&>button]:size-11 [&>a]:bg-white/20 [&>button]:bg-white/20 [&>a]:backdrop-blur-xl [&>button]:backdrop-blur-xl [&>button]:aria-pressed:bg-primary [&>button]:aria-pressed:text-black",
  ),
  gallery: cva(
    "flex w-full justify-start gap-3 overflow-x-auto pb-1 scrollbar-none",
  ),
  thumbnail: cva(
    "relative aspect-[1.4] h-auto w-[calc((100%-1.5rem)/3)] min-w-[calc((100%-1.5rem)/3)] shrink-0 overflow-hidden rounded-2xl border-2 border-transparent p-0 opacity-80 data-[state=on]:border-primary data-[state=on]:opacity-100 focus-visible:ring-2 focus-visible:ring-white",
  ),
  heading: cva("relative isolate mt-auto px-5 pt-24 pb-14 text-white"),
  gradient: cva(
    "pointer-events-none absolute inset-0 bg-linear-to-t from-black/90 via-black/50 to-transparent",
  ),
  content: cva("relative z-10 flex flex-col gap-2"),
  title: clubDetailStyles.title,
  location: cva(
    "flex items-start gap-2 text-sm text-white/75 [&>:is(svg,.sandow-icon)]:shrink-0",
  ),
  panel: cva(`${clubDetailStyles.panel()} pb-0`),
  stats: clubDetailStyles.stats,
  stat: clubDetailStyles.stat,
  icon: clubDetailStyles.statIcon,
};
