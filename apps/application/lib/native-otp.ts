import {
  Capacitor,
  registerPlugin,
  type PluginListenerHandle,
} from "@capacitor/core";

interface SmsOtpPlugin {
  start(options: { id: string }): Promise<void>;
  stop(options: { id: string }): Promise<void>;
  addListener(
    event: "codeReceived",
    callback: (event: { code: string }) => void,
  ): Promise<PluginListenerHandle>;
}
const SmsOtp = registerPlugin<SmsOtpPlugin>("SmsOtp");

export async function startNativeOtp(receive: (code: string) => void) {
  if (
    Capacitor.getPlatform() !== "android" ||
    !Capacitor.isPluginAvailable("SmsOtp")
  )
    return async () => {};
  const id = crypto.randomUUID();
  const listener = await SmsOtp.addListener("codeReceived", ({ code }) =>
    receive(code),
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      SmsOtp.start({ id }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("SMS retrieval unavailable")),
          2000,
        );
      }),
    ]);
  } catch {
    await listener.remove();
    void SmsOtp.stop({ id }).catch(() => undefined);
    return async () => {};
  } finally {
    clearTimeout(timer);
  }
  return async () => {
    await listener.remove();
    await SmsOtp.stop({ id });
  };
}
