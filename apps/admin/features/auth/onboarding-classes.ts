export const onboardingClasses = {
  art:
    "relative overflow-hidden bg-theme-surface-soft flex flex-col justify-center p-[48px] " +
    "[&_p]:text-theme-muted-foreground [&_p]:text-[length:var(--theme-text-caption)] [&_p]:max-w-[240px] " +
    "[&_p]:mt-[32px] max-[767px]:hidden",
  collage:
    "relative w-full max-w-[560px] aspect-square m-auto [&>div]:absolute [&>div]:overflow-hidden " +
    "[&_img]:object-cover",
  content: "w-[min(100%,_360px)] m-auto py-[48px]",
  error: "text-theme-error text-[length:var(--theme-text-body2)] empty:hidden",
  field: "grid gap-[8px]",
  flow: "w-full",
  form: "grid gap-[16px]",
  heading:
    "text-center mb-[16px] [&_h1]:text-[length:var(--theme-text-h4)] [&_h1]:font-[650] [&_h1]:text-balance " +
    "[&_p]:text-theme-muted-foreground [&_p]:mt-[8px] [&_p]:text-[length:var(--theme-text-body2)] " +
    "[&_p]:text-balance [&_h1:focus]:[outline:none]",
  image0: "w-[58%] h-[48%] top-[3%] start-[4%]",
  image1: "w-[42%] h-[62%] top-[22%] end-0",
  image2: "w-[42%] h-[38%] bottom-0 start-[12%]",
  interests: "grid grid-cols-[1fr_1fr] gap-[12px]",
  panel:
    "p-[32px] grid grid-rows-[auto_1fr_auto] gap-[32px] min-w-0 [&_header]:flex [&_header]:justify-center " +
    "[&_footer]:flex [&_footer]:justify-center [&_footer]:font-[650] [&_footer]:text-[length:14px] " +
    "max-[767px]:p-[24px]",
  progress:
    "flex gap-[8px] mb-[32px] [&_span]:flex-1 [&_span]:h-[3px] [&_span]:rounded-[4px] [&_span]:bg-theme-border " +
    "[&_span[data-active='true']]:bg-theme-primary",
  shell:
    "[--theme-color-background:var(--theme-ref-neutral-900)] bg-theme-background text-theme-foreground " +
    "min-h-dvh grid grid-cols-[1fr_1fr] max-[767px]:grid-cols-[1fr]",
};
