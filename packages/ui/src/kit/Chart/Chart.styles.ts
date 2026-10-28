import { cva } from "class-variance-authority";
export const THEMES = { light: "", dark: ".dark" } as const;

export const chartVariants = cva("");

export const chartStyles = {
  chartContainer: cva(
    "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
  ),
  chartTooltipContent: cva("font-medium"),
  chartTooltipContent2: cva("font-medium"),
  chartTooltipContent3: cva(
    "grid min-w-32 items-start gap-1.5 rounded-xl bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-lg ring-1 ring-foreground/5 ",
  ),
  chartTooltipContent4: cva("grid gap-1.5"),
  chartTooltipContent5: cva(
    "flex w-full flex-wrap items-stretch gap-2 [&>:is(svg,.sandow-icon)]:h-2.5 [&>:is(svg,.sandow-icon)]:w-2.5 [&>:is(svg,.sandow-icon)]:text-muted-foreground",
  ),
  chartTooltipContent6: cva("dot"),
  chartTooltipContent7: cva("items-center"),
  chartTooltipContent8: cva(
    "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
  ),
  chartTooltipContent9: cva("flex flex-1 justify-between leading-none"),
  chartTooltipContent10: cva("items-end"),
  chartTooltipContent11: cva("items-center"),
  chartTooltipContent12: cva("grid gap-1.5"),
  chartTooltipContent13: cva("text-muted-foreground"),
  chartTooltipContent14: cva(
    "font-mono font-medium text-foreground tabular-nums",
  ),
  chartLegendContent: cva("flex items-center justify-center gap-4"),
  chartLegendContent2: cva("top"),
  chartLegendContent3: cva("pb-3"),
  chartLegendContent4: cva("pt-3"),
  chartLegendContent5: cva(
    "flex items-center gap-1.5 [&>:is(svg,.sandow-icon)]:h-3 [&>:is(svg,.sandow-icon)]:w-3 [&>:is(svg,.sandow-icon)]:text-muted-foreground",
  ),
  chartLegendContent6: cva("h-2 w-2 shrink-0 rounded-[2px]"),
};
