import type { ComponentProps, ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";
import type { equipmentCardVariants } from "./EquipmentCard.styles";

export type EquipmentCardVariants = VariantProps<typeof equipmentCardVariants>;
export type EquipmentCardProps = Omit<ComponentProps<"div">, "children"> &
  EquipmentCardVariants & {
    label: string;
    description?: string;
    icon?: ReactNode;
  };
