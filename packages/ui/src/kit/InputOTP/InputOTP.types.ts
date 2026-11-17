import type { OTPInput } from "input-otp";
import type { ComponentPropsWithRef } from "react";

export type InputOTPProps = ComponentPropsWithRef<typeof OTPInput>;
export type InputOTPGroupProps = ComponentPropsWithRef<"div">;
export type InputOTPSlotProps = ComponentPropsWithRef<"div"> & { index: number };
export type InputOTPSeparatorProps = ComponentPropsWithRef<"div">;
