"use client";
import { inputOtpStyles } from "./InputOtp.styles";
import type {
  InputOTPGroupProps,
  InputOTPProps,
  InputOTPSeparatorProps,
  InputOTPSlotProps,
} from "./InputOtp.types";

import {
  OTPInput,
  OTPInputContext,
} from "@animate-ui/react/primitives/input-otp";
import { cn } from "@repo/ui/lib/utils";
import * as React from "react";
import { MinusIcon } from "../../icons";

function InputOTP({ className, containerClassName, ...props }: InputOTPProps) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "cn-input-otp flex items-center has-disabled:opacity-50",
        containerClassName,
      )}
      spellCheck={false}
      className={cn(inputOtpStyles.inputOTP(), className)}
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }: InputOTPGroupProps) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn(inputOtpStyles.inputOTPGroup(), className)}
      {...props}
    />
  );
}

function InputOTPSlot({ index, className, ...props }: InputOTPSlotProps) {
  const inputOTPContext = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {};

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(inputOtpStyles.inputOTPSlot(), className)}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className={inputOtpStyles.inputOTPSlot2()}>
          <div className={inputOtpStyles.inputOTPSlot3()} />
        </div>
      )}
    </div>
  );
}

function InputOTPSeparator({ ...props }: InputOTPSeparatorProps) {
  return (
    <div
      data-slot="input-otp-separator"
      className={inputOtpStyles.inputOTPSeparator()}
      role="separator"
      {...props}
    >
      <MinusIcon />
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot };
