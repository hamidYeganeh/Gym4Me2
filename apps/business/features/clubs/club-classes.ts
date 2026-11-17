export const clubClasses = {
  action:
    "club-action flex items-center gap-[0.55rem] justify-center w-[fit-content] min-h-[2.5rem] " +
    "[padding:0.5rem_0.875rem] [border:1px_solid_var(--line)] rounded-[0.625rem] text-[length:0.875rem] " +
    "font-semibold shrink-0 cursor-pointer hover:bg-[color:var(--surface)]",
  activityCard:
    "club-activity-card bg-[color:var(--surface)] [border:1px_solid_var(--line)] rounded-[0.875rem] flex " +
    "items-start justify-between gap-[0.75rem] p-[1rem] [overflow-wrap:anywhere] " +
    "[&>.club-cover]:w-[clamp(68px,_10vw,_120px)] [&>.club-cover]:aspect-square [&>.club-cover]:min-h-0 " +
    "[&>.club-cover]:shrink-0 [&>.club-cover]:rounded-[0.6rem] hover:[border-color:var(--muted)] " +
    "[&_time]:text-[var(--muted)] [&_time]:text-[length:0.875rem] [&_h3]:my-[0.25rem] " +
    "[&_h3]:text-[length:1.15rem] [&_h3]:font-[650] [&_p]:text-[var(--muted)] [&_svg]:text-[var(--muted)]",
  activityDay:
    "club-activity-day bg-[color:color-mix(in_srgb,_var(--theme-color-primary)_40%,_transparent)] " +
    "rounded-[0.45rem]",
  addClass:
    "club-add-class flex items-center gap-[0.55rem] justify-center min-h-[2.4rem] p-[0.5rem] rounded-[0.625rem] " +
    "bg-[color:var(--line)] text-[length:0.875rem] font-semibold hover:bg-[color:var(--surface)]",
  back: "flex items-center gap-[0.55rem] w-[fit-content] text-[var(--muted)] text-[length:0.875rem] mb-[1rem]",
  calendar:
    "self-start p-[0.85rem] [border:1px_solid_var(--line)] rounded-[0.875rem] [&_.club-action]:mt-[0.5rem] " +
    "[&>div:first-child]:bg-transparent [&>div:first-child]:p-0 [&>div:first-child]:mx-auto " +
    "[&_.club-segmented]:mt-[0.75rem] [&_.club-segmented_button]:flex-1 [&_.club-segmented_button]:w-auto " +
    "[&_.club-segmented_button]:px-[0.5rem] max-[740px]:max-w-full",
  classHeading: "club-class-heading",
  clubRow:
    "bg-[color:var(--surface)] [border:1px_solid_var(--line)] rounded-[0.875rem] grid grid-cols-[auto_1fr_auto] " +
    "items-center gap-[1rem] p-[0.85rem] [&_small]:text-[var(--muted)] [&_small]:block " +
    "[&_small]:[overflow-wrap:anywhere] hover:[border-color:var(--muted)] [&_strong]:block " +
    "[&_strong]:[overflow-wrap:anywhere] [&_.club-logo]:w-[48px] [&_.club-logo]:border-0 " +
    "[&_.club-logo]:rounded-[0.5rem] [&_.club-logo]:text-[length:1rem]",
  compact:
    "grid gap-[0.65rem] mt-[1.35rem] [&_.club-activity-card]:bg-transparent [&_.club-activity-card]:border-0 " +
    "[&_.club-activity-card]:[border-top:1px_solid_var(--line)] [&_.club-activity-card]:rounded-none " +
    "[&_.club-activity-card]:px-0",
  container: "w-[min(100%_-_2.5rem,_1080px)] mx-auto",
  cover:
    "club-cover relative overflow-hidden isolate aspect-[3.5] w-full min-h-[160px] rounded-[1rem] " +
    "[background:linear-gradient(135deg,_#302335,_#994d30_58%,_#efb172)] [&_img]:object-cover",
  date: "club-date block mb-[0.75rem] font-semibold",
  description: "text-[var(--muted)] mt-[0.75rem] whitespace-pre-wrap [overflow-wrap:anywhere]",
  details:
    "py-[1rem_4rem] [&_h1]:text-[length:clamp(2rem,_4vw,_3rem)] [&_h1]:font-[720] [&_h1]:tracking-[-0.045em] " +
    "[&_h1]:[overflow-wrap:anywhere] [&_h1]:leading-[1.12]",
  detailsGrid:
    "club-details-grid grid grid-cols-[minmax(0,_1fr)_minmax(250px,_28%)] gap-[clamp(1rem,_3vw,_2.25rem)] " +
    "[padding:1.35rem_var(--club-inset)_0] [border-top:1px_solid_var(--line)] max-[740px]:grid-cols-[1fr]",
  directory: "py-[1rem_4rem]",
  directoryList: "grid gap-[0.75rem] mt-[1.5rem]",
  editor:
    "py-[1rem_4rem] [&_h1]:text-[length:clamp(2rem,_4vw,_3rem)] [&_h1]:leading-[1.12] [&_h1]:font-[720] " +
    "[&_h1]:tracking-[-0.045em] [&_h1]:[overflow-wrap:anywhere]",
  editorGrid: "[padding:1.35rem_var(--club-inset)_0] [border-top:1px_solid_var(--line)]",
  error: "text-theme-error text-[length:0.875rem]",
  field:
    "grid gap-[0.4rem] [&_label]:text-[length:0.875rem] [&_label]:font-semibold [&_label_span]:ml-[0.25rem] " +
    "[&_label_span]:text-[length:0.75rem] [&_label_span]:text-[var(--muted)] [&_label_span]:font-normal " +
    "[&_input]:min-w-0 [&_input]:w-full [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-[0.5rem] " +
    "[&_input]:[padding:0.65rem_0.75rem] [&_input]:text-[length:0.95rem] [&_textarea]:min-w-0 " +
    "[&_textarea]:w-full [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-[0.5rem] " +
    "[&_textarea]:[padding:0.65rem_0.75rem] [&_textarea]:text-[length:0.95rem] [&_textarea]:[resize:vertical]",
  form:
    "club-form [&_h2]:text-[length:1.28rem] [&_h2]:font-[650] [&_h2]:tracking-[-0.025em] " +
    "bg-[color:var(--surface)] [border:1px_solid_var(--line)] rounded-[0.875rem] p-[clamp(1rem,_3vw,_1.65rem)] " +
    "grid gap-[1.1rem]",
  formActions: "flex flex-wrap justify-end gap-[0.5rem]",
  headingRow:
    "[&_h1]:text-[length:clamp(2rem,_4vw,_3rem)] [&_h1]:font-[720] [&_h1]:tracking-[-0.045em] " +
    "[&_h1]:[overflow-wrap:anywhere] [&_h1]:leading-[1.12] [&_h2]:text-[length:1.28rem] [&_h2]:font-[650] " +
    "[&_h2]:tracking-[-0.025em] flex items-center justify-between gap-[1rem] max-[400px]:flex-wrap",
  location: "flex items-center gap-[0.55rem] text-[var(--muted)] mt-[0.75rem]",
  logo:
    "club-logo [&_img]:object-cover grid place-items-center relative isolate overflow-hidden " +
    "w-[clamp(72px,_10vw,_108px)] aspect-square bg-theme-surface-dark text-theme-surface-dark-foreground " +
    "[border:5px_solid_var(--club-background)] rounded-[1rem] text-[length:1.8rem] font-[650] uppercase",
  manageClass:
    "absolute start-theme-4 [inset-block-end:var(--theme-space-4)] inline-flex items-center gap-theme-2 " +
    "[padding:var(--theme-space-1)_var(--theme-space-3)] rounded-theme-md bg-theme-secondary " +
    "text-theme-secondary-foreground text-[length:var(--theme-text-body2)]",
  management:
    "max-w-[calc(var(--theme-space-40)_*_5)] mx-auto py-[var(--theme-space-6)_var(--theme-space-16)] " +
    "[&_.club-management-tabs]:w-full [&_.club-management-tabs]:p-0 [&_.club-management-tabs]:gap-theme-5 " +
    "[&_.club-management-tabs]:bg-transparent [&_.club-management-tabs]:rounded-none " +
    "[&_.club-management-tabs]:[border-bottom:1px_solid_var(--line)] " +
    "[&_.club-form]:max-w-[calc(var(--theme-space-20)_*_8)] [&_.club-form]:mbs-theme-3 " +
    "[&_.club-form]:rounded-theme-lg [&_.club-details-grid]:px-0 [&_.club-details-grid]:[border-top:0] " +
    "[&_.club-details-grid]:grid-cols-[minmax(0,_1fr)] " +
    "[&_.club-activity-day]:bg-[color:color-mix(in_srgb,_var(--theme-color-info)_20%,_transparent)] " +
    "[&_.club-class-heading]:flex [&_.club-class-heading]:items-center [&_.club-class-heading]:gap-theme-2 " +
    "[&_.club-class-heading_.club-add-class]:min-h-0 [&_.club-class-heading_.club-add-class]:p-theme-1 " +
    "[&_.club-class-heading_.club-add-class]:rounded-full [&_.club-segmented_button]:w-auto " +
    "[&_.club-segmented_button]:px-theme-3 " +
    "[&_.club-timeline]:[--date-rail:clamp(var(--theme-space-24),_16vw,_var(--theme-space-48))] " +
    "[&_.club-timeline]:border-0 [&_.club-timeline]:p-0 [&_.club-timeline]:gap-0 " +
    "[&_.club-timeline_.club-date]:[grid-column:1] [&_.club-timeline_.club-date]:m-0 " +
    "[&_.club-timeline_.club-date]:text-[length:var(--theme-text-body2)] " +
    "[&_.club-timeline_.club-date::before]:start-[calc(var(--date-rail)_-_var(--theme-space-7))] " +
    "[&_.club-timeline_.club-date::before]:bg-theme-border-strong [&_.club-date_span]:block " +
    "[&_.club-date_span+span]:text-theme-muted-foreground [&_.club-date_span+span]:font-theme-normal " +
    "max-[600px]:[&_.club-timeline_.club-date::before]:hidden " +
    "max-[600px]:[&_.club-timeline_.club-date]:mbe-theme-2 max-[600px]:[&_.club-date_span]:inline " +
    "max-[600px]:[&_.club-date_span+span]:ms-theme-2",
  managementHeader:
    "flex items-center gap-theme-3 justify-between mbe-theme-5 flex-wrap [&_h1]:flex [&_h1]:items-center " +
    "[&_h1]:gap-theme-3 [&_h1]:text-[length:var(--theme-text-h3)] [&_h1]:font-theme-semibold " +
    "[&_h1]:leading-[var(--theme-leading-h3)] [&_h1]:[overflow-wrap:anywhere] [&_h1]:min-w-0 " +
    "[&_.club-logo]:w-theme-8 [&_.club-logo]:shrink-0 [&_.club-logo]:border-0 [&_.club-logo]:rounded-theme-sm " +
    "[&_.club-logo]:text-[length:var(--theme-text-caption)] [&_.club-action]:bg-theme-muted " +
    "[&_.club-action]:text-theme-muted-foreground",
  managementRow:
    'relative grid grid-cols-[var(--date-rail)_minmax(0,_1fr)] pbe-theme-8 [&::before]:[content:""] ' +
    "[&::before]:absolute [&::before]:[inset-block:var(--theme-space-2)_0] " +
    "[&::before]:start-[calc(var(--date-rail)_-_var(--theme-space-6))] " +
    "[&::before]:[border-inline-start:1px_dashed_var(--theme-color-border-strong)] " +
    "[&:last-child::before]:[inset-block-end:auto] [&_.club-activity-card]:[grid-column:2] " +
    "[&_.club-activity-card]:relative [&_.club-activity-card]:p-theme-4 [&_.club-activity-card]:pbe-theme-16 " +
    "[&_.club-activity-card]:min-h-theme-40 [&_.club-activity-card]:rounded-theme-xl " +
    "max-[600px]:grid-cols-[minmax(0,_1fr)] max-[600px]:[&::before]:hidden " +
    "max-[600px]:[&_.club-activity-card]:[grid-column:1]",
  managementTabs:
    "club-management-tabs [&_[role='tab']]:px-0 [&_[role='tab']]:rounded-none " +
    "[&_[role='tab']]:[border-bottom:2px_solid_transparent] " +
    "[&_[role='tab'][aria-selected='true']]:[border-bottom-color:var(--theme-color-foreground)] " +
    "[&_[role='tab'][aria-selected='true']]:bg-transparent [&_[role='tab'][aria-selected='true']]:shadow-none",
  message:
    "bg-[color:var(--surface)] [border:1px_solid_var(--line)] rounded-[0.875rem] mt-[1.5rem] p-[2rem] grid " +
    "gap-[0.6rem] justify-items-start [&_h1]:text-[length:1.25rem] [&_h1]:font-[650] " +
    "[&_h2]:text-[length:1.25rem] [&_h2]:font-[650] [&_p]:text-[var(--muted)]",
  primary:
    "flex items-center gap-[0.55rem] justify-center w-[fit-content] min-h-[2.5rem] [padding:0.5rem_0.875rem] " +
    "[border:1px_solid_var(--line)] rounded-[0.625rem] text-[length:0.875rem] font-semibold shrink-0 " +
    "cursor-pointer bg-theme-primary text-theme-primary-foreground hover:bg-theme-primary-hover " +
    "disabled:opacity-[0.65] disabled:cursor-wait",
  profile: "px-[var(--club-inset)] pb-[1.5rem]",
  profileActions:
    "flex items-end justify-between gap-[1rem] mb-[1.15rem] [&_.club-logo]:mt-[-3.1rem] " +
    "[&_.club-action]:mt-[0.8rem] [&_.club-action]:text-[var(--club-accent)] " +
    "[&_.club-action]:[border-color:currentColor]",
  schedule: "grid gap-[0.75rem] [align-content:start]",
  segmented:
    "club-segmented flex gap-[2px] p-[3px] bg-[color:var(--line)] rounded-[0.5rem] [&_button]:grid " +
    "[&_button]:w-[36px] [&_button]:h-[36px] [&_button]:place-items-center [&_button]:text-[var(--muted)] " +
    "[&_button]:rounded-[0.375rem] [&_button]:cursor-pointer " +
    "[&_button[aria-pressed='true']]:bg-[color:var(--surface)] [&_button[aria-pressed='true']]:text-[inherit]",
  shell:
    "[--club-background:#f5f2f3] [--club-ink:#300f20] [--club-accent:#a52251] " +
    "[--club-inset:clamp(0px,_3vw,_40px)] [--surface:var(--theme-color-card)] " +
    "[--muted:var(--theme-color-muted-foreground)] " +
    "[--line:color-mix(in_srgb,_var(--theme-color-foreground)_12%,_transparent)] min-h-dvh pt-[32px] " +
    "text-theme-foreground bg-theme-background " +
    "[&[data-profile]]:[--theme-color-background:var(--club-background)] " +
    "[&[data-profile]]:[--theme-color-foreground:var(--club-ink)] " +
    "[&[data-profile]]:[--theme-color-muted-foreground:#735663] [&[data-profile]]:[--theme-color-muted:#eee7eb] " +
    "[&[data-profile]]:[--theme-color-ring:var(--club-accent)] [&[data-profile]]:scheme-light " +
    "[&[data-profile]]:[--surface:#fffafb] [&[data-profile]]:[--muted:#735663] " +
    "[&[data-profile]]:[--line:color-mix(in_srgb,_var(--club-ink)_10%,_transparent)] " +
    "[&[data-profile]]:text-[var(--club-ink)] " +
    "[&[data-profile]]:[background:linear-gradient(#ffedf3,_var(--club-background)_235px)] " +
    "[&_:is(a,_button,_input,_textarea):focus-visible]:[outline:2px_solid_var(--theme-color-ring)] " +
    "[&_:is(a,_button,_input,_textarea):focus-visible]:[outline-offset:2px] " +
    "[&[data-management]]:[--club-background:var(--theme-color-surface-soft)] " +
    "[&[data-management]]:[--line:var(--theme-color-border)] " +
    "[&[data-management]]:[background:linear-gradient(_color-mix(in_srgb,_var(--theme-color-info)_14%,_var(--club-background)),_var(--club-background)_calc(var(--theme-space-20)_*_2)_)]",
  timeline:
    "club-timeline grid gap-[0.65rem] mt-[1.35rem] [border-left:1px_dashed_var(--line)] pl-[1rem] " +
    '[&_.club-date]:relative [&_.club-date::before]:[content:""] [&_.club-date::before]:absolute ' +
    "[&_.club-date::before]:left-[-1.28rem] [&_.club-date::before]:top-[0.5rem] " +
    "[&_.club-date::before]:w-[0.5rem] [&_.club-date::before]:aspect-square " +
    "[&_.club-date::before]:bg-[color:var(--muted)] [&_.club-date::before]:rounded-[50%]",
};
