"use client";

import type { InputOTPSeparatorProps } from "./InputOTP.types";
import type { FC } from "react";

import { inputOTPSlots } from "./InputOTP.styles";

const InputOTPSeparator: FC<InputOTPSeparatorProps> = (props) => {
  const { className, children, ...rest } = props;
  return (
    <div role="separator" className={inputOTPSlots().separator({ className })} {...rest}>
      {children ?? "−"}
    </div>
  );
};
export default InputOTPSeparator;
