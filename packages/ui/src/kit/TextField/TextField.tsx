"use client";

import { Field as FieldPrimitive } from "@base-ui/react/field";
import { useId } from "react";
import { cn } from "../../lib/utils";
import { Field, FieldDescription, FieldError, FieldLabel } from "../Field";
import { Search } from "../Search";
import { LabelInput } from "../LabelInput";
import type { TextFieldProps } from "./TextField.types";

/** Floating label with Base UI description and validation wiring. */
export function TextField({
  label,
  description,
  error,
  hiddenLabel = false,
  fieldClassName,
  smooth = true,
  validate,
  validationMode,
  id,
  name,
  disabled,
  className,
  reducedMotion,
  "aria-invalid": ariaInvalid,
  ...props
}: TextFieldProps) {
  void smooth;
  void reducedMotion;
  void hiddenLabel;
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const Control = props.type === "search" ? Search : LabelInput;
  const invalid = !!error || ariaInvalid === true || ariaInvalid === "true";
  return (
    <FieldPrimitive.Root
      name={name}
      disabled={disabled}
      invalid={invalid || undefined}
      validate={validate}
      validationMode={validationMode}
      render={
        <Field
          className={cn(
            "data-[invalid]:text-destructive [&[data-disabled]_[data-slot=field-label]]:opacity-50",
            fieldClassName,
          )}
        />
      }
    >
      <FieldPrimitive.Label
        htmlFor={inputId}
        render={<FieldLabel className="sr-only" />}
      >
        {label}
      </FieldPrimitive.Label>
      <Control
        label={label}
        {...props}
        id={inputId}
        name={name}
        disabled={disabled}
        className={cn("min-h-11", className)}
        aria-invalid={invalid || ariaInvalid}
      />
      {description && (
        <FieldPrimitive.Description render={<FieldDescription />}>
          {description}
        </FieldPrimitive.Description>
      )}
      <FieldPrimitive.Error
        match={error ? true : undefined}
        render={<FieldError />}
        {...(error ? { children: error } : {})}
      />
    </FieldPrimitive.Root>
  );
}
