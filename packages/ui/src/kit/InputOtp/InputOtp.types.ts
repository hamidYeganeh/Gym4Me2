import type { VariantProps } from "class-variance-authority";
import { OTPInput } from "input-otp";
import type * as React from "react";
import type { inputOtpVariants } from "./InputOtp.styles";
export type InputOTPProps = React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string;
};

export type InputOTPGroupProps = React.ComponentProps<"div">;

export type InputOTPSlotProps = React.ComponentProps<"div"> & {
  index: number;
};

export type InputOTPSeparatorProps = React.ComponentProps<"div">;

export type InputOtpVariants = VariantProps<typeof inputOtpVariants>;
