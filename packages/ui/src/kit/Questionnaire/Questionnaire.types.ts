import { type Button } from "@repo/ui/kit/Button";
import { Questionnaire as QuestionnairePrimitive } from "@shadcn/react/questionnaire";
import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type { questionnaireVariants } from "./Questionnaire.styles";
export type QuestionnaireProps = React.ComponentProps<
  typeof QuestionnairePrimitive.Root
>;

export type QuestionnaireProgressProps = React.ComponentProps<
  typeof QuestionnairePrimitive.Progress
>;

export type QuestionnaireItemProps = React.ComponentProps<
  typeof QuestionnairePrimitive.Item
>;

export type QuestionnaireTitleProps = React.ComponentProps<
  typeof QuestionnairePrimitive.Title
>;

export type QuestionnaireDescriptionProps = React.ComponentProps<
  typeof QuestionnairePrimitive.Description
>;

export type QuestionnaireChoicesProps = React.ComponentProps<
  typeof QuestionnairePrimitive.Choices
>;

export type QuestionnaireChoiceProps = React.ComponentProps<
  typeof QuestionnairePrimitive.Choice
>;

export type QuestionnaireChoiceDescriptionProps = React.ComponentProps<"span">;

export type QuestionnaireInputProps = React.ComponentProps<
  typeof QuestionnairePrimitive.Input
>;

export type QuestionnaireErrorProps = React.ComponentProps<
  typeof QuestionnairePrimitive.Error
>;

export type QuestionnaireActionsProps = React.ComponentProps<"div">;

export type QuestionnairePreviousProps = React.ComponentProps<
  typeof QuestionnairePrimitive.Previous
> &
  Pick<React.ComponentProps<typeof Button>, "size" | "variant">;

export type QuestionnaireSkipProps = React.ComponentProps<
  typeof QuestionnairePrimitive.Skip
> &
  Pick<React.ComponentProps<typeof Button>, "size" | "variant">;

export type QuestionnaireNextProps = React.ComponentProps<
  typeof QuestionnairePrimitive.Next
> &
  Pick<React.ComponentProps<typeof Button>, "size" | "variant">;

export type QuestionnaireSubmitProps = React.ComponentProps<
  typeof QuestionnairePrimitive.Submit
> &
  Pick<React.ComponentProps<typeof Button>, "size" | "variant">;

export type QuestionnaireVariants = VariantProps<typeof questionnaireVariants>;
