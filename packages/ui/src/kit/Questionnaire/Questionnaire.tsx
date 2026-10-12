"use client";
import { questionnaireStyles } from "./Questionnaire.styles";
import type {
  QuestionnaireActionsProps,
  QuestionnaireChoiceDescriptionProps,
  QuestionnaireChoiceProps,
  QuestionnaireChoicesProps,
  QuestionnaireDescriptionProps,
  QuestionnaireErrorProps,
  QuestionnaireInputProps,
  QuestionnaireItemProps,
  QuestionnaireNextProps,
  QuestionnairePreviousProps,
  QuestionnaireProgressProps,
  QuestionnaireProps,
  QuestionnaireSkipProps,
  QuestionnaireSubmitProps,
  QuestionnaireTitleProps,
} from "./Questionnaire.types";

import { cn } from "@repo/ui/lib/utils";
import { Questionnaire as QuestionnairePrimitive } from "@shadcn/react/questionnaire";

import { buttonVariants } from "@repo/ui/kit/Button";
import { CheckIcon } from "lucide-react";

function Questionnaire({ className, ...props }: QuestionnaireProps) {
  return (
    <QuestionnairePrimitive.Root
      data-slot="questionnaire"
      className={cn(questionnaireStyles.questionnaire(), className)}
      {...props}
    />
  );
}

function QuestionnaireProgress({
  className,
  ...props
}: QuestionnaireProgressProps) {
  return (
    <QuestionnairePrimitive.Progress
      data-slot="questionnaire-progress"
      className={cn(questionnaireStyles.questionnaireProgress(), className)}
      {...props}
    />
  );
}

function QuestionnaireItem({ className, ...props }: QuestionnaireItemProps) {
  return (
    <QuestionnairePrimitive.Item
      data-slot="questionnaire-item"
      className={cn(questionnaireStyles.questionnaireItem(), className)}
      {...props}
    />
  );
}

function QuestionnaireTitle({ className, ...props }: QuestionnaireTitleProps) {
  return (
    <QuestionnairePrimitive.Title
      data-slot="questionnaire-title"
      className={cn(questionnaireStyles.questionnaireTitle(), className)}
      {...props}
    />
  );
}

function QuestionnaireDescription({
  className,
  ...props
}: QuestionnaireDescriptionProps) {
  return (
    <QuestionnairePrimitive.Description
      data-slot="questionnaire-description"
      className={cn(questionnaireStyles.questionnaireDescription(), className)}
      {...props}
    />
  );
}

function QuestionnaireChoices({
  className,
  ...props
}: QuestionnaireChoicesProps) {
  return (
    <QuestionnairePrimitive.Choices
      data-slot="questionnaire-choices"
      className={cn(questionnaireStyles.questionnaireChoices(), className)}
      {...props}
    />
  );
}

function QuestionnaireChoice({
  children,
  className,
  ...props
}: QuestionnaireChoiceProps) {
  return (
    <QuestionnairePrimitive.Choice
      data-slot="questionnaire-choice"
      className={cn(
        questionnaireStyles.questionnaireChoice(),
        questionnaireStyles.questionnaireChoice2(),
        className,
      )}
      {...props}
    >
      <QuestionnairePrimitive.ChoiceInput
        data-slot="questionnaire-choice-input"
        className={questionnaireStyles.questionnaireChoice3()}
      />
      <span
        aria-hidden="true"
        data-slot="questionnaire-choice-indicator"
        className={questionnaireStyles.questionnaireChoice4()}
      >
        <span
          data-slot="questionnaire-choice-indicator-dot"
          className={questionnaireStyles.questionnaireChoice5()}
        />
        <CheckIcon
          data-slot="questionnaire-choice-indicator-check"
          className={questionnaireStyles.questionnaireChoice6()}
        />
      </span>
      <QuestionnairePrimitive.ChoiceLabel
        data-slot="questionnaire-choice-label"
        className={questionnaireStyles.questionnaireChoice7()}
      >
        {children}
      </QuestionnairePrimitive.ChoiceLabel>
      <QuestionnairePrimitive.ChoiceShortcut
        data-slot="questionnaire-choice-shortcut"
        className={questionnaireStyles.questionnaireChoice8()}
      />
    </QuestionnairePrimitive.Choice>
  );
}

function QuestionnaireChoiceDescription({
  className,
  ...props
}: QuestionnaireChoiceDescriptionProps) {
  return (
    <span
      data-slot="questionnaire-choice-description"
      className={cn(
        questionnaireStyles.questionnaireChoiceDescription(),
        className,
      )}
      {...props}
    />
  );
}

function QuestionnaireInput({ className, ...props }: QuestionnaireInputProps) {
  return (
    <div
      data-slot="questionnaire-input-wrapper"
      className={questionnaireStyles.questionnaireInput()}
    >
      <QuestionnairePrimitive.Input
        data-slot="questionnaire-input"
        className={cn(
          questionnaireStyles.questionnaireInput2(),
          questionnaireStyles.questionnaireInput3(),
          className,
        )}
        {...props}
      />
    </div>
  );
}

function QuestionnaireError({ className, ...props }: QuestionnaireErrorProps) {
  return (
    <QuestionnairePrimitive.Error
      data-slot="questionnaire-error"
      className={cn(questionnaireStyles.questionnaireError(), className)}
      {...props}
    />
  );
}

function QuestionnaireActions({
  className,
  ...props
}: QuestionnaireActionsProps) {
  return (
    <div
      data-slot="questionnaire-actions"
      className={cn(questionnaireStyles.questionnaireActions(), className)}
      {...props}
    />
  );
}

function QuestionnairePrevious({
  children,
  className,
  size = "default",
  variant = "outline",
  ...props
}: QuestionnairePreviousProps) {
  return (
    <QuestionnairePrimitive.Previous
      data-slot="questionnaire-previous"
      data-size={size}
      data-variant={variant}
      className={cn(
        buttonVariants({ size, variant }),
        questionnaireStyles.questionnairePrevious(),
        className,
      )}
      {...props}
    >
      {children ?? "Previous"}
    </QuestionnairePrimitive.Previous>
  );
}

function QuestionnaireSkip({
  children,
  className,
  size = "default",
  variant = "outline",
  ...props
}: QuestionnaireSkipProps) {
  return (
    <QuestionnairePrimitive.Skip
      data-slot="questionnaire-skip"
      data-size={size}
      data-variant={variant}
      className={cn(
        buttonVariants({ size, variant }),
        questionnaireStyles.questionnaireSkip(),
        className,
      )}
      {...props}
    >
      {children ?? "Skip"}
    </QuestionnairePrimitive.Skip>
  );
}

function QuestionnaireNext({
  children,
  className,
  size = "default",
  variant = "default",
  ...props
}: QuestionnaireNextProps) {
  return (
    <QuestionnairePrimitive.Next
      data-slot="questionnaire-next"
      data-size={size}
      data-variant={variant}
      className={cn(
        buttonVariants({ size, variant }),
        questionnaireStyles.questionnaireNext(),
        className,
      )}
      {...props}
    >
      {children ?? "Next"}
    </QuestionnairePrimitive.Next>
  );
}

function QuestionnaireSubmit({
  children,
  className,
  size = "default",
  variant = "default",
  ...props
}: QuestionnaireSubmitProps) {
  return (
    <QuestionnairePrimitive.Submit
      data-slot="questionnaire-submit"
      data-size={size}
      data-variant={variant}
      className={cn(
        buttonVariants({ size, variant }),
        questionnaireStyles.questionnaireSubmit(),
        className,
      )}
      {...props}
    >
      {children ?? "Submit"}
    </QuestionnairePrimitive.Submit>
  );
}

export {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
};
