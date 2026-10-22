"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "@repo/i18n";
import { Button } from "@repo/ui/kit/Button";
import { Card, CardContent } from "@repo/ui/kit/Card";

export function DeviceNotifications() {
  const t = useTranslations("DeviceNotifications");
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported" | "checking"
  >("checking");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  useEffect(() => {
    const refresh = () =>
      setPermission(
        window.isSecureContext &&
          "Notification" in window &&
          "serviceWorker" in navigator
          ? Notification.permission
          : "unsupported",
      );
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
  async function test() {
    setStatus("sending");
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        setStatus("idle");
        return;
      }
      const registration = await navigator.serviceWorker.register(
        "/notification-test-sw.js",
        { scope: "/notifications/" },
      );
      if (!registration.active) {
        await new Promise<void>((resolve, reject) => {
          const worker = registration.installing ?? registration.waiting;
          if (!worker) {
            reject(new Error("worker unavailable"));
            return;
          }
          const timeout = window.setTimeout(() => {
            worker.removeEventListener("statechange", changed);
            reject(new Error("worker timeout"));
          }, 8000);
          function changed() {
            if (worker?.state === "activated") {
              clearTimeout(timeout);
              worker.removeEventListener("statechange", changed);
              resolve();
            }
          }
          worker.addEventListener("statechange", changed);
          changed();
        });
      }
      await registration.showNotification(t("testTitle"), {
        body: t("testBody"),
        tag: "gym4me-device-check",
        data: { path: "/notifications" },
      });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }
  return (
    <Card>
      <CardContent className="grid gap-3 pt-5">
        <h2 className="font-semibold">{t("title")}</h2>
        <p className="text-sm leading-7 text-muted-foreground">
          {t("deliveryStatus")}
        </p>
        <p className="text-sm">{t(permission)}</p>
        {permission === "denied" && (
          <p className="text-sm leading-7">{t("deniedHelp")}</p>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={
            permission === "checking" ||
            permission === "unsupported" ||
            permission === "denied" ||
            status === "sending"
          }
          onClick={test}
        >
          {t(status === "sending" ? "sending" : "test")}
        </Button>
        <p role="status" className="text-sm">
          {status === "sent" ? t("sent") : status === "error" ? t("error") : ""}
        </p>
      </CardContent>
    </Card>
  );
}
