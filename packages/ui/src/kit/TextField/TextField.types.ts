import type { ReactNode } from "react";
import type { Field as FieldPrimitive } from "@base-ui/react/field";
import type { SmoothInputProps } from "../SmoothInput";

export type TextFieldProps = SmoothInputProps & {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  hiddenLabel?: boolean;
  fieldClassName?: string;
  /** Disable the animated caret while retaining the same Base UI input. */
  smooth?: boolean;
  validate?: FieldPrimitive.Root.Props["validate"];
  validationMode?: FieldPrimitive.Root.Props["validationMode"];
};
