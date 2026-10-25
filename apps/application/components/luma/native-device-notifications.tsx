"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "@repo/i18n";
import { useApiContext } from "@repo/api/provider";
import { useGrowthQuery } from "@repo/api/growth";
import { Button } from "@repo/ui/kit/Button";
const bindingKey = "gym4me.native-push.binding",
  optInKey = "gym4me.native-push.opt-in";
export function NativePushRuntime() {
  const { api } = useApiContext(),
    locale = useLocale(),
    router = useRouter();
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_NATIVE_EXPORT !== "true") return;
    let disposed = false;
    const removers: (() => Promise<void>)[] = [];
    const clear = () => {
      localStorage.removeItem(bindingKey);
      localStorage.removeItem(optInKey);
      void import("@capacitor/push-notifications")
        .then(async ({ PushNotifications }) => {
          await PushNotifications.removeAllDeliveredNotifications();
          await PushNotifications.unregister();
        })
        .catch(() => undefined);
    };
    window.addEventListener("gym4me:clear-native-push", clear);
    void (async () => {
      const { PushNotifications } =
          await import("@capacitor/push-notifications"),
        { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform() || disposed) return;
      for (const listener of [
        await PushNotifications.addListener("registration", (token) => {
          if (disposed || localStorage.getItem(optInKey) !== "1") return;
          void api
            .request<{ id: string }>({
              method: "POST",
              path: "profile/native-push",
              body: {
                platform: Capacitor.getPlatform(),
                token: token.value,
                locale,
              },
            })
            .then((result) => {
              if (!disposed && localStorage.getItem(optInKey) === "1") {
                localStorage.setItem(bindingKey, result.id);
                window.dispatchEvent(new Event("gym4me:native-push-updated"));
              }
            })
            .catch(() => {
              window.dispatchEvent(new Event("gym4me:native-push-error"));
            });
        }),
        await PushNotifications.addListener("registrationError", () =>
          window.dispatchEvent(new Event("gym4me:native-push-error")),
        ),
        await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (event) => {
            const id = event.notification.data?.bindingId;
            if (id && id === localStorage.getItem(bindingKey))
              router.push("/notifications");
          },
        ),
      ]) {
        if (disposed) await listener.remove();
        else removers.push(() => listener.remove());
      }
      if (
        localStorage.getItem(optInKey) === "1" &&
        (await PushNotifications.checkPermissions()).receive === "granted"
      )
        await PushNotifications.register();
    })().catch(() => undefined);
    return () => {
      disposed = true;
      window.removeEventListener("gym4me:clear-native-push", clear);
      for (const remove of removers) void remove();
    };
  }, [api, locale, router]);
  return null;
}
export function NativeDeviceNotifications() {
  const t = useTranslations("Growth"),
    { api } = useApiContext(),
    q = useGrowthQuery<{
      android: boolean;
      ios: boolean;
      device: { id: string; platform: string } | null;
    }>("profile/native-push");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [platform, setPlatform] = useState("");
  const refetch = q.refetch;
  useEffect(() => {
    void import("@capacitor/core").then(({ Capacitor }) =>
      setPlatform(Capacitor.getPlatform()),
    );
    const updated = () => {
      setBusy(false);
      setMessage(t("nativeEnabled"));
      void refetch();
    };
    const failed = () => {
      setBusy(false);
      setMessage(t("failed"));
    };
    window.addEventListener("gym4me:native-push-updated", updated);
    window.addEventListener("gym4me:native-push-error", failed);
    return () => {
      window.removeEventListener("gym4me:native-push-updated", updated);
      window.removeEventListener("gym4me:native-push-error", failed);
    };
  }, [refetch, t]);
  async function enable() {
    setBusy(true);
    setMessage("");
    try {
      const { PushNotifications } =
        await import("@capacitor/push-notifications");
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== "granted") {
        setMessage(t("nativeDenied"));
        setBusy(false);
        return;
      }
      localStorage.setItem(optInKey, "1");
      if (platform === "android")
        await PushNotifications.createChannel({
          id: "gym4me",
          name: "Gym4Me",
          importance: 4,
        });
      await PushNotifications.register();
    } catch {
      setMessage(t("failed"));
      setBusy(false);
    }
  }
  async function disable() {
    setBusy(true);
    try {
      window.dispatchEvent(new Event("gym4me:clear-native-push"));
      await api.request({ method: "POST", path: "profile/native-push/remove" });
      await q.refetch();
      setMessage(t("nativeDisabled"));
    } catch {
      setMessage(t("failed"));
    } finally {
      setBusy(false);
    }
  }
  async function test() {
    setBusy(true);
    try {
      const result = await api.request<{ result: string }>({
        method: "POST",
        path: "profile/native-push/test",
      });
      setMessage(
        result.result === "accepted"
          ? t("nativeAccepted")
          : result.result === "queued"
            ? t("nativeQueued")
            : t("failed"),
      );
    } catch {
      setMessage(t("failed"));
    } finally {
      setBusy(false);
    }
  }
  const available =
    platform === "android"
      ? q.data?.android
      : platform === "ios"
        ? q.data?.ios
        : false;
  return (
    <section className="grid gap-4 rounded-2xl border p-4">
      <h2 className="text-lg font-semibold">{t("nativeNotifications")}</h2>
      <p>{t("nativeHint")}</p>
      {!available && <p role="status">{t("nativeUnavailable")}</p>}
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={!available || busy || !!q.data?.device}
          onClick={() => void enable()}
        >
          {t("nativeEnable")}
        </Button>
        <Button
          variant="outline"
          disabled={busy || !q.data?.device}
          onClick={() => void disable()}
        >
          {t("nativeDisable")}
        </Button>
        <Button
          variant="outline"
          disabled={busy || !q.data?.device}
          onClick={() => void test()}
        >
          {t("nativeTest")}
        </Button>
      </div>
      <p role="status">{message}</p>
    </section>
  );
}
