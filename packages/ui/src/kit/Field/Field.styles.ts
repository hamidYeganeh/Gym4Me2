import { cva } from "class-variance-authority";
export const fieldVariants = cva(
  "group/field flex w-full gap-3 data-[invalid=true]:text-destructive",
  {
    variants: {
      orientation: {
        vertical: "flex-col *:w-full [&>.sr-only]:w-auto",
        horizontal:
          "flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
        responsive:
          "flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
      },
    },
    defaultVariants: {
      orientation: "vertical",
    },
  },
);

export const fieldStyles = {
  fieldSet: cva(
    "flex flex-col gap-6 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
  ),
  fieldLegend: cva(
    "mb-3 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base",
  ),
  fieldGroup: cva(
    "group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4",
  ),
  fieldContent: cva(
    "group/field-content flex flex-1 flex-col gap-1 leading-snug",
  ),
  fieldLabel: cva(
    "group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-data-checked:bg-input/30 has-[>[data-slot=field]]:rounded-2xl has-[>[data-slot=field]]:border has-[>[data-slot=field]]:not-has-[:disabled,[data-disabled]]:hover:bg-input/40    *:data-[slot=field]:p-4",
  ),
  fieldLabel2: cva(
    "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col",
  ),
  fieldTitle: cva(
    "flex w-fit items-center gap-2 text-sm font-medium group-data-[disabled=true]/field:opacity-50",
  ),
  fieldDescription: cva(
    "text-start text-sm leading-normal font-normal text-muted-foreground group-has-data-horizontal/field:text-balance [[data-variant=legend]+&]:-mt-1.5",
  ),
  fieldDescription2: cva("last:mt-0 nth-last-2:-mt-1"),
  fieldDescription3: cva(
    "[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
  ),
  fieldSeparator: cva(
    "relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2",
  ),
  fieldSeparator2: cva("absolute inset-0 top-1/2"),
  fieldSeparator3: cva(
    "relative mx-auto block w-fit bg-background px-2 text-muted-foreground",
  ),
  fieldError: cva("ms-4 flex list-disc flex-col gap-1"),
  fieldError2: cva("text-sm font-normal text-destructive"),
};
