"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "@repo/i18n";
import { useApiContext } from "@repo/api/provider";
import {
  usePushDevice,
  pushWorkerMessage,
  PUSH_SCOPE,
} from "@repo/api/web-push";
import { Button } from "@repo/ui/kit/Button";
import { Card, CardContent } from "@repo/ui/kit/Card";

async function worker() {
  const registration = await navigator.serviceWorker.register("/push-sw.js", {
    scope: PUSH_SCOPE,
  });
  if (
    !registration.active ||
    !registration.active.scriptURL.endsWith("/push-sw.js") ||
    registration.active.state !== "activated"
  ) {
    await new Promise<void>((resolve, reject) => {
      const candidate = registration.installing ?? registration.waiting;
      if (!candidate) {
        reject(new Error("Worker unavailable"));
        return;
      }
      const timeout = setTimeout(() => {
        candidate.removeEventListener("statechange", changed);
        reject(new Error("Worker timeout"));
      }, 10000);
      function changed() {
        if (candidate?.state === "activated") {
          clearTimeout(timeout);
          candidate.removeEventListener("statechange", changed);
          resolve();
        }
      }
      candidate.addEventListener("statechange", changed);
      changed();
    });
  }
  return registration;
}
function applicationKey(value: string) {
  const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}
export function DeviceNotifications() {
  const t = useTranslations("DeviceNotifications"),
    locale = useLocale();
  const { api } = useApiContext(),
    query = usePushDevice();
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported" | "checking"
  >("checking");
  const [bound, setBound] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "enabled" | "disabled" | "accepted" | "queued" | "error"
  >("idle");
  useEffect(() => {
    const refresh = () =>
      setPermission(
        window.isSecureContext &&
          "Notification" in window &&
          "serviceWorker" in navigator &&
          "PushManager" in window
          ? Notification.permission
          : "unsupported",
      );
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
  useEffect(() => {
    let disposed = false;
    if (permission === "granted" && query.data?.subscriptionId) {
      void navigator.serviceWorker
        .getRegistration(PUSH_SCOPE)
        .then(async (registration) => {
          const id = registration?.active
            ? await pushWorkerMessage(registration, { type: "status" })
            : null;
          const subscription =
            await registration?.pushManager.getSubscription();
          if (!disposed) setBound(subscription ? id : null);
        })
        .catch(() => {
          if (!disposed) setBound(null);
        });
    }
    return () => {
      disposed = true;
    };
  }, [permission, query.data?.subscriptionId]);
  const active =
    permission === "granted" && !!bound && bound === query.data?.subscriptionId;
  const available =
    !!query.data?.enabled && !!query.data.publicKey && !query.error;
  async function enable() {
    setBusy(true);
    setStatus("idle");
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return;
      const registration = await worker();
      let subscription = await registration.pushManager.getSubscription();
      const key = applicationKey(query.data!.publicKey!);
      if (subscription) {
        const previous = subscription.options.applicationServerKey;
        if (
          !previous ||
          previous.byteLength !== key.byteLength ||
          !Array.from(new Uint8Array(previous)).every(
            (value, index) => value === key[index],
          )
        ) {
          await subscription.unsubscribe();
          subscription = null;
        }
      }
      subscription ??= await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key,
      });
      const saved = await api.request<{ subscriptionId: string }>({
        method: "POST",
        path: "profile/push/subscribe",
        body: {
          endpoint: subscription.endpoint,
          keys: subscription.toJSON().keys,
          locale,
        },
      });
      await pushWorkerMessage(registration, {
        type: "bind",
        bindingId: saved.subscriptionId,
      });
      setBound(saved.subscriptionId);
      setStatus("enabled");
      await query.refetch();
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }
  async function disable() {
    setBusy(true);
    setStatus("idle");
    try {
      const registration =
        await navigator.serviceWorker.getRegistration(PUSH_SCOPE);
      if (registration?.active)
        await pushWorkerMessage(registration, { type: "clear" });
      await (await registration?.pushManager.getSubscription())?.unsubscribe();
      setBound(null);
      await api.request({ method: "POST", path: "profile/push/unsubscribe" });
      setStatus("disabled");
      await query.refetch();
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }
  async function test() {
    setBusy(true);
    setStatus("idle");
    try {
      const result = await api.request<{
        status: "accepted" | "queued" | "failed";
      }>({
        method: "POST",
        path: "profile/push/test",
      });
      setStatus(result.status === "failed" ? "error" : result.status);
      await query.refetch();
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
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
        {permission === "unsupported" && (
          <p className="text-sm leading-7">{t("installHelp")}</p>
        )}
        {query.error && (
          <p className="text-sm" role="status">
            {t(
              [401, 403].includes(query.error.status) ? "signIn" : "loadError",
            )}
          </p>
        )}
        {!query.error && query.data && !available && (
          <p className="text-sm">{t("unconfigured")}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={active ? "outline" : "default"}
            disabled={
              busy ||
              !available ||
              ["checking", "unsupported", "denied"].includes(permission)
            }
            onClick={active ? disable : enable}
          >
            {t(busy ? "sending" : active ? "disable" : "enable")}
          </Button>
          {active && (
            <Button
              type="button"
              variant="outline"
              disabled={busy || !available}
              onClick={test}
            >
              {t("test")}
            </Button>
          )}
          {query.error && (
            <Button
              type="button"
              variant="outline"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              {t("retry")}
            </Button>
          )}
        </div>
        <p role="status" className="text-sm leading-7">
          {status === "idle" ? (active ? t("enabled") : "") : t(status)}
        </p>
      </CardContent>
    </Card>
  );
}
