"use client";
import { fieldStyles, fieldVariants } from "./Field.styles";
import type {
  FieldContentProps,
  FieldDescriptionProps,
  FieldErrorProps,
  FieldGroupProps,
  FieldLabelProps,
  FieldLegendProps,
  FieldProps,
  FieldSeparatorProps,
  FieldSetProps,
  FieldTitleProps,
} from "./Field.types";

import { cn } from "@repo/ui/lib/utils";
import { useMemo } from "react";

import { Label } from "@repo/ui/kit/Label";
import { Separator } from "@repo/ui/kit/Separator";

function FieldSet({ className, ...props }: FieldSetProps) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(fieldStyles.fieldSet(), className)}
      {...props}
    />
  );
}

function FieldLegend({
  className,
  variant = "legend",
  ...props
}: FieldLegendProps) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(fieldStyles.fieldLegend(), className)}
      {...props}
    />
  );
}

function FieldGroup({ className, ...props }: FieldGroupProps) {
  return (
    <div
      data-slot="field-group"
      className={cn(fieldStyles.fieldGroup(), className)}
      {...props}
    />
  );
}

function Field({ className, orientation = "vertical", ...props }: FieldProps) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  );
}

function FieldContent({ className, ...props }: FieldContentProps) {
  return (
    <div
      data-slot="field-content"
      className={cn(fieldStyles.fieldContent(), className)}
      {...props}
    />
  );
}

function FieldLabel({ className, ...props }: FieldLabelProps) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        fieldStyles.fieldLabel(),
        fieldStyles.fieldLabel2(),
        className,
      )}
      {...props}
    />
  );
}

function FieldTitle({ className, ...props }: FieldTitleProps) {
  return (
    <div
      data-slot="field-label"
      className={cn(fieldStyles.fieldTitle(), className)}
      {...props}
    />
  );
}

function FieldDescription({ className, ...props }: FieldDescriptionProps) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        fieldStyles.fieldDescription(),
        fieldStyles.fieldDescription2(),
        fieldStyles.fieldDescription3(),
        className,
      )}
      {...props}
    />
  );
}

function FieldSeparator({
  children,
  className,
  ...props
}: FieldSeparatorProps) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn(fieldStyles.fieldSeparator(), className)}
      {...props}
    >
      <Separator className={fieldStyles.fieldSeparator2()} />
      {children && (
        <span
          className={fieldStyles.fieldSeparator3()}
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  );
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: FieldErrorProps) {
  const content = useMemo(() => {
    if (children) {
      return children;
    }

    if (!errors?.length) {
      return null;
    }

    const uniqueErrors = [
      ...new Map(errors.map((error) => [error?.message, error])).values(),
    ];

    if (uniqueErrors?.length == 1) {
      return uniqueErrors[0]?.message;
    }

    return (
      <ul className={fieldStyles.fieldError()}>
        {uniqueErrors.map(
          (error, index) =>
            error?.message && <li key={index}>{error.message}</li>,
        )}
      </ul>
    );
  }, [children, errors]);

  if (!content) {
    return null;
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn(fieldStyles.fieldError2(), className)}
      {...props}
    >
      {content}
    </div>
  );
}

export {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
};
