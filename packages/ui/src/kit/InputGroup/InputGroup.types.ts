import type { ButtonProps } from "../Button/Button.types";
import type { InputProps } from "../Input/Input.types";
import type { TextareaProps } from "../Textarea/Textarea.types";
import type { ComponentPropsWithRef } from "react";

export type InputGroupProps = ComponentPropsWithRef<"div">;
export type InputGroupTextProps = ComponentPropsWithRef<"span">;

export type InputGroupAddonProps = ComponentPropsWithRef<"div"> & {
  align?: "inline-start" | "inline-end" | "block-start" | "block-end";
};
export type InputGroupInputProps = InputProps;
export type InputGroupTextareaProps = TextareaProps;
export type InputGroupButtonProps = ButtonProps;
