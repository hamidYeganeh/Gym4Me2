"use client";
import { useState } from "react";
import { useTranslations } from "@repo/i18n";
import { Button } from "../kit/Button";

export function CoachProfileLink({ userId }: { userId: string }) {
  const t = useTranslations("Practice");
  const [message, setMessage] = useState("");
  async function copy() {
    setMessage("");
    try {
      const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const url = new URL("/coaches/detail", base);
      if (!["https:", "http:"].includes(url.protocol)) {
        setMessage(t("publicLinkUnavailable"));
        return;
      }
      url.searchParams.set("id", userId);
      await navigator.clipboard.writeText(url.toString());
      setMessage(t("publicLinkCopied"));
    } catch {
      setMessage(t("publicLinkUnavailable"));
    }
  }
  return (
    <div>
      <Button type="button" variant="outline" onClick={() => void copy()}>
        {t("copyPublicLink")}
      </Button>
      <p role="status" className="text-sm text-muted-foreground">
        {message}
      </p>
    </div>
  );
}
