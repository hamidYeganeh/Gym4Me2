"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

type Stop = () => Promise<void>;
export type StartOtpAutofill = (
  receive: (code: string) => void,
) => Promise<Stop>;
const AutofillContext = createContext<StartOtpAutofill | undefined>(undefined);

export function OtpAutofillProvider({
  start,
  children,
}: {
  start: StartOtpAutofill;
  children: ReactNode;
}) {
  return (
    <AutofillContext.Provider value={start}>
      {children}
    </AutofillContext.Provider>
  );
}

/** Start before requesting SMS so even fast deliveries are captured. */
export function useOtpAutofill(receive: (code: string) => void) {
  const start = useContext(AutofillContext);
  const current = useRef(0);
  const stopRef = useRef<Stop | undefined>(undefined);
  const stop = useCallback(() => {
    current.current++;
    const previous = stopRef.current;
    stopRef.current = undefined;
    return previous?.().catch(() => undefined);
  }, []);
  useEffect(
    () => () => {
      void stop();
    },
    [stop],
  );
  const begin = async () => {
    const stopping = stop();
    const attempt = current.current;
    await stopping;
    if (current.current !== attempt) return;
    if (!start) return;
    try {
      const cleanup = await start((code) => {
        if (current.current === attempt && /^[0-9]{5}$/.test(code))
          receive(code);
      });
      if (current.current !== attempt) await cleanup();
      else stopRef.current = cleanup;
    } catch {
      // Manual entry and OS keyboard suggestions remain available.
    }
  };
  return { begin, stop };
}
