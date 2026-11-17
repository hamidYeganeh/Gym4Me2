"use client";

import { createContext, useContext, useState } from "react";

import type { ReactNode } from "react";

const ResetPhoneContext = createContext<{
  phone: string;
  setPhone: (phone: string) => void;
} | null>(null);

export const ResetPhoneProvider = (props: { children: ReactNode }) => {
  const { children } = props;
  const [phone, setPhone] = useState("");
  return (
    <ResetPhoneContext.Provider value={{ phone, setPhone }}>{children}</ResetPhoneContext.Provider>
  );
};

export function useResetPhone() {
  const value = useContext(ResetPhoneContext);
  if (!value) throw new Error("ResetPhoneProvider is required.");
  return value;
}
