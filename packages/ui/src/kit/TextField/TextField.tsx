"use client";

import { useId } from "react";
import { Field as FieldPrimitive } from "@base-ui/react/field";
import { Field, FieldDescription, FieldError, FieldLabel } from "../Field";
import { SmoothInput } from "../SmoothInput";
import { cn } from "../../lib/utils";
import type { TextFieldProps } from "./TextField.types";

/** Skiper's smooth caret with Base UI's label, description and validation wiring. */
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
  const generatedId = useId();
  const inputId = id ?? generatedId;
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
        render={<FieldLabel className={hiddenLabel ? "sr-only" : undefined} />}
      >
        {label}
      </FieldPrimitive.Label>
      <SmoothInput
        {...props}
        id={inputId}
        name={name}
        disabled={disabled}
        className={cn("min-h-11", className)}
        reducedMotion={!smooth || reducedMotion}
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
