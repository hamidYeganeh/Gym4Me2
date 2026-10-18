"use client";
import { useId, type ComponentProps, type ReactNode } from "react";
import { Field, FieldLabel } from "../kit/Field";
import { Input } from "../kit/Input";

export function LoginFieldError({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <p
      id={id}
      role="alert"
      className="text-sm leading-6 text-destructive [overflow-wrap:anywhere]"
    >
      {children}
    </p>
  );
}

/** Label and localized error reference this mounted field, including during motion. */
export function LoginField({
  field,
  label,
  error,
  hiddenLabel = false,
  ...props
}: Omit<ComponentProps<typeof Input>, "id" | "name"> & {
  field: "phone" | "password";
  label: string;
  error?: string;
  hiddenLabel?: boolean;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const description = [props["aria-describedby"], error ? errorId : null]
    .filter(Boolean)
    .join(" ");
  return (
    <Field
      data-invalid={!!error || undefined}
      data-disabled={props.disabled || undefined}
    >
      <FieldLabel htmlFor={id} className={hiddenLabel ? "sr-only" : undefined}>
        {label}
      </FieldLabel>
      <Input
        {...props}
        id={id}
        name={field}
        data-auth-field={field}
        aria-invalid={!!error || undefined}
        aria-describedby={description || undefined}
      />
      {error && <LoginFieldError id={errorId}>{error}</LoginFieldError>}
    </Field>
  );
}
