"use client";

import { OTPInput } from "@animate-ui/react/primitives/input-otp";

import type { InputOTPProps } from "../InputOTP.types";
import type { FC } from "react";

import { inputOTPSlots } from "../InputOTP.styles";

const AnimatedInputOTP: FC<InputOTPProps> = (props) => {
  const { containerClassName, ...rest } = props;
  return (
    <OTPInput
      {...rest}
      containerClassName={inputOTPSlots().root({ className: containerClassName })}
    />
  );
};
export default AnimatedInputOTP;
