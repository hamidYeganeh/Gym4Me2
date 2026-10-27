"use client";

import { sileo, type SileoOptions } from "sileo";

type Message = string | SileoOptions;
type MessageMethod = (message: Message, overrides?: SileoOptions) => string;
type ToastController = Pick<typeof sileo, "promise" | "clear"> &
  Record<
    "success" | "error" | "info" | "warning" | "show" | "action",
    MessageMethod
  > & {
    dismiss: (id?: string) => void;
  };
const options = (message: Message, overrides?: SileoOptions): SileoOptions => {
  const result =
    typeof message === "string"
      ? { ...overrides, title: message }
      : { ...message, ...overrides };
  // Keep long API errors readable instead of clipping them inside Sileo's pill.
  if (result.title && result.title.length > 48 && !result.description) {
    const preview = result.title.slice(0, 44).replace(/\s+\S*$/, "");
    return { ...result, title: `${preview}…`, description: result.title };
  }
  return result;
};

/** Existing app messages share Sileo's controller with action/promise toasts. */
export const toast: ToastController = {
  success: (message: Message, overrides?: SileoOptions) =>
    sileo.success(options(message, overrides)),
  error: (message: Message, overrides?: SileoOptions) =>
    sileo.error(options(message, overrides)),
  info: (message: Message, overrides?: SileoOptions) =>
    sileo.info(options(message, overrides)),
  warning: (message: Message, overrides?: SileoOptions) =>
    sileo.warning(options(message, overrides)),
  show: (message: Message, overrides?: SileoOptions) =>
    sileo.show(options(message, overrides)),
  action: (message: Message, overrides?: SileoOptions) =>
    sileo.action(options(message, overrides)),
  promise: sileo.promise,
  dismiss: (id?: string) => (id ? sileo.dismiss(id) : sileo.clear()),
  clear: sileo.clear,
};

export { sileo };
export type { SileoOptions, SileoPosition, SileoState } from "sileo";
