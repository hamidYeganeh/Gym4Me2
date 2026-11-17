export const sessionClasses = {
  actions: "flex flex-wrap gap-[10px] items-center",
  back: "inline-flex gap-[8px] items-center text-theme-muted-foreground text-[length:0.85rem] mb-[28px]",
  dateTile:
    "shrink-0 flex flex-col text-center overflow-hidden w-[60px] [border:1px_solid_var(--theme-color-border)] " +
    "rounded-[10px] [&_span]:text-[length:0.7rem] [&_span]:uppercase [&_span]:bg-theme-muted [&_span]:p-[5px] " +
    "[&_strong]:text-[length:1.6rem] [&_strong]:p-[5px] [&_strong]:font-medium",
  editor:
    "grid grid-cols-[minmax(0,_0.85fr)_minmax(0,_1.35fr)] gap-[48px] items-start max-[850px]:gap-[28px] " +
    "max-[850px]:grid-cols-[minmax(0,_0.8fr)_minmax(0,_1.2fr)] max-[640px]:grid-cols-[1fr]",
  error: "text-theme-error text-[length:0.875rem]",
  eyebrow: "text-theme-muted-foreground text-[length:0.67rem] tracking-[0.12em] font-semibold",
  form: "flex flex-col gap-[24px] min-w-0",
  header: "mb-[38px]",
  headingRow:
    "flex justify-between items-center gap-[24px] [&_h1]:text-[length:clamp(1.8rem,_3vw,_2.65rem)] " +
    "[&_h1]:leading-[1.2] [&_h1]:font-bold [&_h1]:tracking-[-0.045em] [&_h1]:my-[8px] " +
    "[&_p]:text-theme-muted-foreground [&_p]:text-[length:0.875rem] [&_p]:leading-[1.6] max-[850px]:items-start " +
    "max-[850px]:flex-col",
  hint: "session-hint text-theme-muted-foreground text-[length:0.875rem] leading-[1.6]",
  introMark: "text-[length:5rem] text-theme-primary leading-[1] mt-[24px] max-[640px]:hidden",
  options:
    "flex flex-col gap-[12px] [&_h2]:text-[length:0.875rem] [&_h2]:font-semibold " +
    "[&_h2]:text-theme-muted-foreground",
  poster:
    "relative aspect-square overflow-hidden rounded-[var(--theme-radius-xl,_16px)] bg-theme-secondary " +
    "[&>div:first-child]:h-full [&>div:first-child]:min-h-[100%] [&>div:first-child]:rounded-none " +
    "max-[640px]:aspect-[1.4]",
  posterCaption:
    "absolute [inset:auto_0_0] p-[24px] text-theme-foreground " +
    "bg-[color:color-mix(in_srgb,_var(--theme-color-background)_94%,_transparent)] " +
    "[&_h2]:text-[length:clamp(1.6rem,_2.7vw,_2.5rem)] [&_h2]:font-[750] [&_h2]:tracking-[-0.045em] " +
    "[&_h2]:leading-[1.05] [&_h2]:my-[14px_10px] [&_h2]:[overflow-wrap:anywhere] [&_p]:text-[length:0.85rem] " +
    "[&_p]:text-theme-muted-foreground",
  preview: "sticky top-[32px] min-w-0 max-[640px]:static",
  previewFooter:
    "flex justify-between [border-top:1px_solid_var(--theme-color-border)] pt-[18px] mt-[4px] " +
    "text-[length:0.85rem] [&_span]:text-theme-muted-foreground",
  previewMeta:
    "[padding:24px_8px] flex flex-col gap-[14px] [&_p]:flex [&_p]:items-center [&_p]:gap-[10px] " +
    "[&_p]:text-[length:0.85rem] [&_p]:[overflow-wrap:anywhere] [&_svg]:text-theme-muted-foreground " +
    "[&_svg]:shrink-0 max-[640px]:hidden",
  reservationIntro:
    "p-[32px] bg-theme-secondary rounded-[var(--theme-radius-xl,_16px)] min-h-[380px] " +
    "[&_h2]:text-[length:2.5rem] [&_h2]:font-[650] [&_h2]:tracking-[-0.045em] [&_h2]:leading-[1.15] " +
    "[&_h2]:my-[24px] [&_p]:text-theme-muted-foreground [&_p]:leading-[1.7] [&_p]:text-[length:0.9rem] " +
    "max-[640px]:min-h-auto max-[640px]:p-[24px] max-[640px]:[&_h2]:text-[length:1.8rem]",
  roster:
    "mt-[8px] text-[length:0.85rem] [&_summary]:cursor-pointer [&_ul]:[padding:12px_0] [&_ul]:flex " +
    "[&_ul]:flex-col [&_ul]:gap-[12px] [&_li]:flex [&_li]:items-center [&_li]:justify-between [&_li]:gap-[12px] " +
    "[&_small]:block [&_small]:text-theme-muted-foreground",
  schedule: "flex flex-col gap-[20px]",
  sessionCard:
    "flex items-start gap-[24px] p-[24px] [border:1px_solid_var(--theme-color-border)] " +
    "rounded-[var(--theme-radius-xl,_16px)] bg-theme-card max-[850px]:flex-wrap max-[640px]:p-[18px] " +
    "max-[640px]:gap-[16px]",
  sessionContent:
    "flex-1 min-w-0 flex flex-col gap-[8px] [&_h2]:text-[length:1.25rem] [&_h2]:font-[650] " +
    "[&_h2]:[overflow-wrap:anywhere] [&_p]:text-[length:0.85rem] [&_p]:text-theme-muted-foreground " +
    "[&_p]:[overflow-wrap:anywhere]",
  shell:
    "max-w-[1120px] mx-auto [padding:36px_32px_80px] text-theme-foreground max-[640px]:[padding:24px_18px_80px]",
  success:
    "flex flex-col items-start gap-[20px] p-[40px] [border:1px_solid_var(--theme-color-border)] rounded-[16px] " +
    "bg-theme-card [&_h2]:text-[length:1.75rem] [&_h2]:font-semibold [&_p]:text-theme-muted-foreground " +
    "max-[640px]:p-[24px]",
  surface:
    "bg-[color:color-mix(in_srgb,_var(--theme-color-muted)_55%,_var(--theme-color-background))] " +
    "[border:1px_solid_var(--theme-color-border)] rounded-[var(--theme-radius-lg,_12px)] p-[16px] " +
    "[&_.session-hint]:mt-[12px]",
  total:
    "grid grid-cols-[1fr_auto] gap-[12px] py-[16px] [border-top:1px_solid_var(--theme-color-border)] " +
    "[&_p]:[grid-column:1/-1] [&_p]:text-[length:0.75rem] [&_p]:text-theme-muted-foreground",
  twoColumns:
    "grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[16px] max-[850px]:grid-cols-[1fr] " +
    "max-[640px]:grid-cols-[repeat(2,_minmax(0,_1fr))] max-[390px]:grid-cols-[1fr]",
};
