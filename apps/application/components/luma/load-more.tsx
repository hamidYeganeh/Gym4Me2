"use client";
import { useRef, useState, type ReactNode } from "react";
import { useTranslations } from "@repo/i18n";
import {
  activeSurfaceTarget,
  isActiveSurfaceElement,
} from "@repo/ui/lib/active-surface";

/** Move focus after pagination without overriding the user's next action. */
export function LumaLoadMore({
  loading,
  onLoad,
  children,
}: {
  loading: boolean;
  onLoad(): Promise<string | undefined>;
  children: ReactNode;
}) {
  const pending = useRef(false);
  const button = useRef<HTMLButtonElement>(null);
  const [failed, setFailed] = useState(false);
  const t = useTranslations("Luma");
  return (
    <>
      <button
        ref={button}
        type="button"
        className="luma-cta"
        disabled={loading}
        aria-busy={loading}
        onClick={() => {
          if (pending.current) return;
          const origin = button.current;
          const surface = origin?.closest("main") ?? null;
          const restoreFocus = document.activeElement === origin;
          pending.current = true;
          setFailed(false);
          void Promise.resolve()
            .then(onLoad)
            .then((id) => {
              if (restoreFocus)
                requestAnimationFrame(() => {
                  const row = id ? activeSurfaceTarget(id) : origin;
                  if (
                    row &&
                    isActiveSurfaceElement(row) &&
                    isActiveSurfaceElement(surface) &&
                    surface?.contains(row) &&
                    (document.activeElement === document.body ||
                      document.activeElement === origin)
                  )
                    row.focus();
                });
            })
            .catch(() => setFailed(true))
            .finally(() => {
              pending.current = false;
            });
        }}
      >
        {children}
      </button>
      {failed && (
        <p role="alert" className="luma-error">
          {t("loadError")}
        </p>
      )}
    </>
  );
}
