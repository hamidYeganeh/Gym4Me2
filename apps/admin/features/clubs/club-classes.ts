export const clubClasses = {
  action:
    "club-action flex items-center gap-[0.55rem] justify-center w-[fit-content] min-h-[2.5rem] " +
    "[padding:0.5rem_0.875rem] [border:1px_solid_var(--line)] rounded-[0.625rem] text-[length:0.875rem] " +
    "font-semibold shrink-0 cursor-pointer hover:bg-[color:var(--surface)]",
  container: "w-[min(100%_-_2.5rem,_1080px)] mx-auto",
  cover:
    "club-cover relative overflow-hidden isolate aspect-[3.5] w-full min-h-[160px] rounded-[1rem] " +
    "[background:linear-gradient(135deg,_#302335,_#994d30_58%,_#efb172)] [&_img]:object-cover",
  form:
    "club-form [&_h2]:text-[length:1.28rem] [&_h2]:font-[650] [&_h2]:tracking-[-0.025em] " +
    "bg-[color:var(--surface)] [border:1px_solid_var(--line)] rounded-[0.875rem] p-[clamp(1rem,_3vw,_1.65rem)] " +
    "grid gap-[1.1rem]",
  headingRow:
    "[&_h1]:text-[length:clamp(2rem,_4vw,_3rem)] [&_h1]:font-[720] [&_h1]:tracking-[-0.045em] " +
    "[&_h1]:[overflow-wrap:anywhere] [&_h1]:leading-[1.12] [&_h2]:text-[length:1.28rem] [&_h2]:font-[650] " +
    "[&_h2]:tracking-[-0.025em] flex items-center justify-between gap-[1rem] max-[400px]:flex-wrap",
  logo:
    "club-logo [&_img]:object-cover grid place-items-center relative isolate overflow-hidden " +
    "w-[clamp(72px,_10vw,_108px)] aspect-square bg-theme-surface-dark text-theme-surface-dark-foreground " +
    "[border:5px_solid_var(--club-background)] rounded-[1rem] text-[length:1.8rem] font-[650] uppercase",
  primary:
    "flex items-center gap-[0.55rem] justify-center w-[fit-content] min-h-[2.5rem] [padding:0.5rem_0.875rem] " +
    "[border:1px_solid_var(--line)] rounded-[0.625rem] text-[length:0.875rem] font-semibold shrink-0 " +
    "cursor-pointer bg-theme-primary text-theme-primary-foreground hover:bg-theme-primary-hover " +
    "disabled:opacity-[0.65] disabled:cursor-wait",
};
