import { cn } from "@repo/ui/lib/utils";
import { alertStyles, alertVariants } from "./Alert.styles";
import type {
  AlertActionProps,
  AlertDescriptionProps,
  AlertProps,
  AlertTitleProps,
} from "./Alert.types";

function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: AlertTitleProps) {
  return (
    <div
      data-slot="alert-title"
      className={cn(alertStyles.alertTitle(), className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: AlertDescriptionProps) {
  return (
    <div
      data-slot="alert-description"
      className={cn(alertStyles.alertDescription(), className)}
      {...props}
    />
  );
}

function AlertAction({ className, ...props }: AlertActionProps) {
  return (
    <div
      data-slot="alert-action"
      className={cn(alertStyles.alertAction(), className)}
      {...props}
    />
  );
}

export { Alert, AlertAction, AlertDescription, AlertTitle };
