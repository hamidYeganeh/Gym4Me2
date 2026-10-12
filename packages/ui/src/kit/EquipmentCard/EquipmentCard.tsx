import { cn } from "../../lib/utils";
import {
  equipmentCardVariants,
  equipmentCardStyles as s,
} from "./EquipmentCard.styles";
import type { EquipmentCardProps } from "./EquipmentCard.types";

export function EquipmentCard({
  label,
  description,
  icon,
  className,
  ...props
}: EquipmentCardProps) {
  return (
    <div
      {...props}
      data-slot="equipment-card"
      className={cn(equipmentCardVariants(), className)}
    >
      {icon && (
        <span aria-hidden="true" className={s.icon()}>
          {icon}
        </span>
      )}
      <div className={s.content()}>
        <span className={s.label()}>{label}</span>
        {description && (
          <span className={s.description()} title={description}>
            {description}
          </span>
        )}
      </div>
    </div>
  );
}
