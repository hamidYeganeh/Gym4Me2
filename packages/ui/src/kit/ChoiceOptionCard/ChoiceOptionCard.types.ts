import type { ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";
import type { choiceOptionCardVariants } from "./ChoiceOptionCard.styles";
export type ChoiceOptionCardVariants = VariantProps<
  typeof choiceOptionCardVariants
>;
type Common = {
  label: string;
  description?: string;
  supportingText?: string;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
  info?: string;
  infoLabel?: string;
};
export type ChoiceOptionCardProps = Common &
  (
    | { control?: "choice"; value: string }
    | { control: "note" }
    | {
        control: "switch";
        checked: boolean;
        onCheckedChange: (checked: boolean) => void;
      }
  );
