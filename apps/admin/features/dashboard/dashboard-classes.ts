export const dashboardClasses = {
  brand: "grid place-items-center w-[48px] h-[48px] max-[600px]:hidden",
  card:
    "p-[26px] [border:1px_solid_var(--dashboard-border)] rounded-[26px] bg-[color:var(--dashboard-card)] " +
    "[&_h2]:text-[length:23px] [&_h2]:font-[650] max-[600px]:[padding:22px_20px] max-[600px]:rounded-[22px] " +
    "max-[600px]:[&_h2]:text-[length:21px]",
  cards: "flex flex-col gap-[14px]",
  chart:
    "relative w-[min(100%,_300px)] aspect-square [margin:16px_auto_24px] [&_svg]:w-full [&_svg]:h-full " +
    "[&_svg]:[transform:rotate(-90deg)] [&_svg]:overflow-visible [&_circle]:[fill:none] " +
    "[&_circle]:[stroke-width:9] [&_circle]:[stroke-linecap:round] max-[600px]:w-[min(100%,_260px)]",
  content:
    "min-w-0 min-h-dvh px-[80px] max-[900px]:pl-[80px] max-[900px]:pr-0 " +
    "max-[600px]:[padding:0_0_calc(80px_+_env(safe-area-inset-bottom))]",
  create: "dashboard-create",
  demo: "text-center text-[var(--dashboard-muted)] text-[length:12px] [margin:10px_0_18px]",
  floatingCreate:
    "fixed right-[24px] bottom-[24px] w-[72px] h-[60px] grid place-items-center " +
    "[border:1px_solid_var(--dashboard-border)] rounded-[20px] bg-[color:var(--theme-ref-neutral-850)] " +
    "[box-shadow:0_6px_20px_rgb(0_0_0_/_15%)] max-[900px]:hidden",
  header: "relative flex justify-center items-center min-h-[64px]",
  heading: "text-center [&_h1]:text-[length:20px] [&_h1]:leading-[1.4] [&_h1]:font-[650]",
  legend:
    "flex flex-col gap-[16px] text-[length:16px] [&_div]:flex [&_div]:justify-between [&_div]:gap-[16px] " +
    "[&_dt]:flex [&_dt]:items-center [&_dt]:gap-[16px] [&_dd]:tabular-nums [&_i]:w-[8px] [&_i]:h-[8px] " +
    "[&_i]:rounded-[50%]",
  main:
    "max-w-[720px] [margin:0_auto] [padding:20px_24px_48px] max-[900px]:mx-auto max-[600px]:m-0 " +
    "max-[600px]:[padding:16px_16px_96px] max-[600px]:pb-[24px]",
  memberArc: "[stroke:var(--theme-ref-neutral-50)]",
  memberDot: "bg-[color:var(--theme-ref-neutral-50)]",
  menu:
    "absolute right-0 top-[8px] [&_summary]:[list-style:none] [&_summary]:cursor-pointer [&_summary]:grid " +
    "[&_summary]:place-items-center [&_summary]:w-[40px] [&_summary]:h-[40px] " +
    "[&_summary]:[border:1px_solid_var(--dashboard-border)] [&_summary]:rounded-[50%] " +
    "[&_summary]:bg-[color:var(--theme-ref-neutral-850)] [&_summary]:tracking-[2px] " +
    "[&_summary::-webkit-details-marker]:hidden",
  menuContent:
    "absolute right-0 z-[20] mt-[8px] w-[200px] p-[8px] [border:1px_solid_var(--dashboard-border)] " +
    "rounded-[12px] bg-[color:var(--theme-ref-neutral-850)] [box-shadow:0_12px_28px_rgb(0_0_0_/_20%)] " +
    "[&_a]:block [&_a]:w-full [&_a]:text-left [&_a]:p-[10px] [&_a]:text-[length:13px] [&_a]:rounded-[6px] " +
    "[&_a]:cursor-pointer [&_button]:block [&_button]:w-full [&_button]:text-left [&_button]:p-[10px] " +
    "[&_button]:text-[length:13px] [&_button]:rounded-[6px] [&_button]:cursor-pointer " +
    "[&_a:hover]:bg-[color:var(--dashboard-border)] [&_button:hover]:bg-[color:var(--dashboard-border)]",
  navigation:
    "flex flex-col gap-[20px] [margin:auto_0] [&_a]:grid [&_a]:place-items-center [&_a]:w-[56px] [&_a]:h-[52px] " +
    "[&_a]:rounded-[14px] [&_a]:text-[var(--dashboard-muted)] [&_a]:[transition:background_150ms,_color_150ms] " +
    "[&_a:hover]:text-[var(--theme-ref-neutral-50)] [&_a:hover]:bg-[color:var(--theme-ref-neutral-850)] " +
    "[&_a[aria-current='page']]:text-[var(--theme-ref-neutral-50)] " +
    "[&_a[aria-current='page']]:bg-[color:var(--theme-ref-neutral-850)] " +
    "[&_.dashboard-create]:bg-[color:var(--theme-ref-neutral-850)] max-[600px]:flex-row " +
    "max-[600px]:justify-around max-[600px]:w-full max-[600px]:gap-[8px] max-[600px]:m-0",
  panelLabel: "text-[var(--dashboard-muted)] text-[length:11px] max-[600px]:hidden",
  period:
    "[&_select]:text-[var(--dashboard-muted)] [&_select]:bg-transparent [&_select]:text-[length:14px] " +
    "[&_select]:[padding:3px_22px_3px_8px] [&_select]:cursor-pointer [&_select]:scheme-dark",
  shell:
    "[--theme-color-background:var(--theme-ref-neutral-900)] min-h-dvh bg-[color:var(--theme-ref-neutral-900)] " +
    "text-[var(--theme-ref-neutral-50)] [--dashboard-card:var(--theme-ref-neutral-900)] " +
    "[--dashboard-border:var(--theme-ref-neutral-800)] [--dashboard-muted:var(--theme-ref-neutral-400)] " +
    "[&_a:focus-visible]:[outline:2px_solid_var(--theme-color-primary)] " +
    "[&_a:focus-visible]:[outline-offset:4px] " +
    "[&_button:focus-visible]:[outline:2px_solid_var(--theme-color-primary)] " +
    "[&_button:focus-visible]:[outline-offset:4px] " +
    "[&_summary:focus-visible]:[outline:2px_solid_var(--theme-color-primary)] " +
    "[&_summary:focus-visible]:[outline-offset:4px] " +
    "[&_select:focus-visible]:[outline:2px_solid_var(--theme-color-primary)] " +
    "[&_select:focus-visible]:[outline-offset:4px]",
  sidebar:
    "fixed [inset:0_auto_0_0] w-[80px] flex items-center flex-col [padding:24px_10px] z-[10] " +
    "bg-[color:var(--theme-ref-neutral-900)] max-[600px]:[inset:auto_0_0] max-[600px]:w-full " +
    "max-[600px]:h-[calc(72px_+_env(safe-area-inset-bottom))] max-[600px]:[padding:8px_16px] " +
    "max-[600px]:[border-top:1px_solid_var(--dashboard-border)] " +
    "max-[600px]:pb-[calc(8px_+_env(safe-area-inset-bottom))]",
  skip:
    "[&:not(:focus)]:absolute [&:not(:focus)]:w-[1px] [&:not(:focus)]:h-[1px] [&:not(:focus)]:p-0 " +
    "[&:not(:focus)]:overflow-hidden [&:not(:focus)]:[clip-path:inset(50%)] [&:not(:focus)]:whitespace-nowrap " +
    "focus:fixed focus:left-[90px] focus:top-[10px] focus:z-[30] focus:p-[12px] " +
    "focus:bg-[color:var(--theme-ref-neutral-850)]",
  srOnly: "absolute w-[1px] h-[1px] p-0 overflow-hidden [clip-path:inset(50%)] whitespace-nowrap",
  total:
    "absolute inset-0 flex flex-col justify-center items-center gap-[5px] [&_span]:text-[length:16px] " +
    "[&_span]:text-[var(--dashboard-muted)] [&_strong]:text-[length:clamp(36px,_5vw,_46px)] " +
    "[&_strong]:font-[650] [&_strong]:leading-[1.3] [&_strong]:tabular-nums",
  visitorArc: "[stroke:var(--theme-ref-neutral-500)]",
  visitorDot: "bg-[color:var(--theme-ref-neutral-500)]",
};
