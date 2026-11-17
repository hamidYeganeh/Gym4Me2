"use client";

import type { InputOTPGroupProps } from "./InputOTP.types";
import type { FC } from "react";

import { inputOTPSlots } from "./InputOTP.styles";

const InputOTPGroup: FC<InputOTPGroupProps> = (props) => {
  const { className, children, ...rest } = props;
  return (
    <div className={inputOTPSlots().group({ className })} {...rest}>
      {children}
    </div>
  );
};
export default InputOTPGroup;
