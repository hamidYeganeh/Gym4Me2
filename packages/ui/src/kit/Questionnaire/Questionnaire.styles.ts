import { cva } from "class-variance-authority";
export const questionnaireVariants = cva("");

export const questionnaireStyles = {
  questionnaire: cva("flex w-full min-w-0 flex-col gap-6"),
  questionnaireProgress: cva(
    "min-h-[1lh] w-fit min-w-[14ch] text-xs font-medium text-muted-foreground tabular-nums",
  ),
  questionnaireItem: cva(
    "flex min-w-0 flex-col gap-5 border-0 p-0 outline-none",
  ),
  questionnaireTitle: cva(
    "font-heading text-base font-semibold text-pretty [&:not(:has(~[data-slot=questionnaire-description]))]:mb-5",
  ),
  questionnaireDescription: cva("text-sm text-pretty text-muted-foreground"),
  questionnaireChoices: cva("group/questionnaire-choices grid min-w-0 gap-3"),
  questionnaireChoice: cva(
    "group/questionnaire-choice relative flex min-h-11 cursor-pointer items-start gap-2.5 rounded-3xl border border-input px-4 py-3 text-start text-sm transition-colors outline-none select-none hover:bg-input/40    data-invalid:border-destructive data-checked:border-primary/40 data-checked:bg-primary/10",
  ),
  questionnaireChoice2: cva(
    "data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-50",
  ),
  questionnaireChoice3: cva(
    "absolute inset-0 z-10 size-full cursor-pointer opacity-0",
  ),
  questionnaireChoice4: cva(
    "pointer-events-none relative flex size-4 shrink-0 translate-y-[--spacing(0.45)] items-center justify-center rounded-[5px] border border-transparent bg-input/90 group-has-data-[slot=questionnaire-choice-description]/questionnaire-choice:translate-y-0.5 group-data-[type=radio]/questionnaire-choice:rounded-full group-data-checked/questionnaire-choice:border-primary group-data-checked/questionnaire-choice:bg-primary group-data-checked/questionnaire-choice:text-primary-foreground ",
  ),
  questionnaireChoice5: cva(
    "hidden size-2 rounded-full bg-primary-foreground group-data-[type=checkbox]/questionnaire-choice:hidden group-data-checked/questionnaire-choice:block ",
  ),
  questionnaireChoice6: cva(
    "hidden size-3.5 group-data-[type=radio]/questionnaire-choice:hidden group-data-checked/questionnaire-choice:block",
  ),
  questionnaireChoice7: cva("flex min-w-0 flex-1 flex-col gap-1 leading-snug"),
  questionnaireChoice8: cva(
    "pointer-events-none ms-auto hidden size-5 shrink-0 translate-y-[--spacing(0.45)] items-center justify-center rounded-full border border-primary/10 bg-background/80 font-mono text-[0.625rem] leading-none font-medium text-muted-foreground group-has-data-[slot=questionnaire-choice-description]/questionnaire-choice:translate-y-0.5 group-data-[shortcut]/questionnaire-choice:inline-flex",
  ),
  questionnaireChoiceDescription: cva("text-muted-foreground"),
  questionnaireInput: cva("group/questionnaire-input relative w-full min-w-0"),
  questionnaireInput2: cva(
    "h-9 min-h-11 w-full min-w-0 rounded-3xl border border-transparent bg-input/50 px-3 py-1 text-base transition-[color,box-shadow,background-color] outline-none    disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 sm:min-h-0 md:text-sm  ",
  ),
  questionnaireInput3: cva(
    "selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground",
  ),
  questionnaireError: cva("mt-2 text-sm text-destructive"),
  questionnaireActions: cva(
    "grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 sm:min-h-9",
  ),
  questionnairePrevious: cva(
    "col-start-1 row-start-1 min-h-11 justify-self-start sm:min-h-0",
  ),
  questionnaireSkip: cva(
    "col-start-2 row-start-1 min-h-11 justify-self-end sm:min-h-0",
  ),
  questionnaireNext: cva(
    "col-start-3 row-start-1 min-h-11 justify-self-end sm:min-h-0",
  ),
  questionnaireSubmit: cva(
    "col-start-3 row-start-1 min-h-11 justify-self-end sm:min-h-0",
  ),
};
