"use client";

import { OTPInputContext } from "@animate-ui/react/primitives/input-otp";
import { useContext } from "react";

import type { InputOTPSlotProps } from "../InputOTP.types";
import type { FC } from "react";

import { inputOTPSlots } from "../InputOTP.styles";

const AnimatedInputOTPSlot: FC<InputOTPSlotProps> = (props) => {
  const { index, className, ...rest } = props;
  const context = useContext(OTPInputContext);
  const slot = context?.slots[index];
  if (!slot) throw new Error("InputOTPSlot requires an InputOTP parent and a valid index");
  const styles = inputOTPSlots();
  return (
    <div
      data-slot="input-otp-slot"
      data-active={slot.isActive}
      className={styles.slot({ className })}
      {...rest}
    >
      {slot.char ?? <span className={styles.placeholder()}>{slot.placeholderChar}</span>}
      {slot.hasFakeCaret && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className={styles.caret()} />
        </div>
      )}
    </div>
  );
};
export default AnimatedInputOTPSlot;
