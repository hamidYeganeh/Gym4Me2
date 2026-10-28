"use client";

import * as React from "react";
import { useEffect, useSyncExternalStore, useTransition } from "react";
import { getLocaleMessages } from "@repo/i18n/messages";

// Recovery must also work when the locale, API or theme provider cannot render.
function savedLocale(): "fa" | "en" {
  try {
    const local = localStorage.getItem("gym4me-locale");
    if (local === "fa" || local === "en") return local;
  } catch {
    /* Storage may be unavailable in private browsing. */
  }
  const cookie = document.cookie.match(
    /(?:^|;\s*)gym4me-locale=(fa|en)(?:;|$)/,
  )?.[1];
  if (cookie === "fa" || cookie === "en") return cookie;
  return document.documentElement.lang === "en" ? "en" : "fa";
}
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("gym4me:locale", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("gym4me:locale", listener);
  };
}
const serverLocale = () => "fa" as const;
function useRecoveryLocale() {
  return useSyncExternalStore(subscribe, savedLocale, serverLocale);
}
export type RecoveryProps = { error: unknown; retry: () => void };

function RecoveryContent({
  locale,
  retry,
  notFound = false,
}: {
  locale: "fa" | "en";
  retry?: () => void;
  notFound?: boolean;
}) {
  const text = getLocaleMessages(locale).Recovery;
  const heading = React.useRef<HTMLHeadingElement>(null);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);
  const action = {
    minHeight: 44,
    padding: "12px 20px",
    border: "1px solid currentColor",
    borderRadius: 12,
    font: "inherit",
    color: "inherit",
    background: "transparent",
    cursor: "pointer",
    textDecoration: "none",
  } as const;
  return (
    <main
      lang={locale}
      dir={locale === "fa" ? "rtl" : "ltr"}
      style={{
        minHeight: "65dvh",
        display: "grid",
        placeContent: "center",
        padding: "48px 24px",
        gap: 20,
        textAlign: "center",
        background: "var(--background, #101113)",
        color: "var(--foreground, #f7f8fa)",
        fontFamily: "var(--font-iransansx, system-ui), sans-serif",
        lineHeight: 1.8,
      }}
    >
      <h1
        ref={heading}
        tabIndex={-1}
        style={{ fontSize: 24, fontWeight: 700, margin: 0 }}
      >
        {notFound ? text.notFoundTitle : text.errorTitle}
      </h1>
      <p
        role={notFound ? undefined : "alert"}
        style={{ maxWidth: 480, margin: "0 auto" }}
      >
        {notFound ? text.notFoundDescription : text.errorDescription}
      </p>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 12,
        }}
      >
        {retry && (
          <button
            type="button"
            disabled={pending}
            aria-busy={pending}
            style={action}
            onClick={() => startTransition(retry)}
          >
            {text.retry}
          </button>
        )}
        <a href="/" style={action}>
          {text.home}
        </a>
      </div>
    </main>
  );
}

export function RouteError({ retry }: RecoveryProps) {
  return <RecoveryContent locale={useRecoveryLocale()} retry={retry} />;
}
export function NotFound() {
  return <RecoveryContent locale={useRecoveryLocale()} notFound />;
}
export function GlobalError({ retry }: RecoveryProps) {
  const locale = useRecoveryLocale();
  return (
    <html lang={locale} dir={locale === "fa" ? "rtl" : "ltr"}>
      <head>
        <title>{getLocaleMessages(locale).Recovery.errorTitle}</title>
      </head>
      <body style={{ margin: 0, minHeight: "100dvh", background: "#101113" }}>
        <RecoveryContent locale={locale} retry={retry} />
      </body>
    </html>
  );
}
