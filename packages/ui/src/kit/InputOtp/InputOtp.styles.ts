import { cva } from "class-variance-authority";
export const inputOtpVariants = cva("");

export const inputOtpStyles = {
  inputOTP: cva("disabled:cursor-not-allowed"),
  inputOTPGroup: cva(
    "flex items-center rounded-3xl has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 ",
  ),
  inputOTPSlot: cva(
    "relative flex size-9 items-center justify-center border-y border-e border-input bg-input/50 text-sm transition-all outline-none first:rounded-s-3xl first:border-s last:rounded-e-3xl aria-invalid:border-destructive data-[active=true]:z-10 data-[active=true]:border-ring data-[active=true]:ring-3 data-[active=true]:ring-ring/30 data-[active=true]:aria-invalid:ring-destructive/20 ",
  ),
  inputOTPSlot2: cva(
    "pointer-events-none absolute inset-0 flex items-center justify-center",
  ),
  inputOTPSlot3: cva(
    "h-4 w-px animate-caret-blink bg-foreground duration-1000",
  ),
  inputOTPSeparator: cva(
    "flex items-center [&_svg:not([class*='size-'])]:size-4",
  ),
};
