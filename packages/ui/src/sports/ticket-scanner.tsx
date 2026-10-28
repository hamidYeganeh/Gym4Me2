"use client";
import { useTranslations } from "@repo/i18n";
import { useEffect, useRef, useState } from "react";
import {
  Camera1Icon as Camera,
  CheckIcon as Check,
  Scan1Icon as ScanLine,
} from "../icons";
import { BottomSheet } from "../kit/BottomSheet";
import { Button } from "../kit/Button";

type Detector = {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue?: string }[]>;
};
type DetectorConstructor = {
  new (options: { formats: string[] }): Detector;
  getSupportedFormats?: () => Promise<string[]>;
};
/** Reads only. The existing check-in form remains the single attendance command. */
export function TicketScanner({ onRead }: { onRead: (token: string) => void }) {
  const t = useTranslations("LumaDesign");
  const luma = useTranslations("Luma");
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<
    "starting" | "scanning" | "read" | "unavailable" | "unsupported" | "denied"
  >("starting");
  const video = useRef<HTMLVideoElement>(null);
  const callback = useRef(onRead);
  useEffect(() => {
    callback.current = onRead;
  }, [onRead]);
  useEffect(() => {
    if (!open) return;
    let disposed = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function stop() {
      stream?.getTracks().forEach((track) => track.stop());
      if (video.current && video.current.srcObject === stream)
        video.current.srcObject = null;
      if (timer) clearTimeout(timer);
    }
    function visibility() {
      if (document.hidden) stop();
      else setAttempt((value) => value + 1);
    }
    document.addEventListener("visibilitychange", visibility);
    async function start() {
      const Constructor = (
        window as Window & { BarcodeDetector?: DetectorConstructor }
      ).BarcodeDetector;
      if (!navigator.mediaDevices?.getUserMedia) {
        setState("unavailable");
        return;
      }
      setState("starting");
      try {
        let detector: Detector | undefined;
        if (Constructor) {
          try {
            const formats = await Constructor.getSupportedFormats?.();
            if (!formats || formats.includes("qr_code"))
              detector = new Constructor({ formats: ["qr_code"] });
          } catch {
            /* Use the local decoder if the browser detector is incomplete. */
          }
        }
        const decode = detector
          ? null
          : (await import("../lib/ticket-code")).decodeTicketFrame;
        if (disposed || document.hidden) return;
        const canvas = document.createElement("canvas");
        const context = decode
          ? canvas.getContext("2d", { willReadFrequently: true })
          : null;
        if (!detector && !context) {
          setState("unsupported");
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
          },
          audio: false,
        });
        if (disposed || document.hidden || !video.current) {
          stop();
          return;
        }
        video.current.srcObject = stream;
        await video.current.play();
        if (disposed) {
          stop();
          return;
        }
        setState("scanning");
        async function read() {
          if (disposed || document.hidden || !video.current) return;
          try {
            let codes: { rawValue?: string }[] = [];
            if (detector) codes = await detector.detect(video.current);
            else if (context && decode && video.current.readyState >= 2) {
              const scale = Math.min(1, 640 / video.current.videoWidth);
              canvas.width = Math.max(
                1,
                Math.round(video.current.videoWidth * scale),
              );
              canvas.height = Math.max(
                1,
                Math.round(video.current.videoHeight * scale),
              );
              context.drawImage(
                video.current,
                0,
                0,
                canvas.width,
                canvas.height,
              );
              const frame = context.getImageData(
                0,
                0,
                canvas.width,
                canvas.height,
              );
              const result = decode(frame);
              if (result) codes = [{ rawValue: result }];
            }
            if (disposed || document.hidden) return;
            const token = codes.find(
              (code) => code.rawValue && code.rawValue.length <= 8192,
            )?.rawValue;
            if (token) {
              stop();
              setState("read");
              callback.current(token);
              return;
            }
          } catch {
            /* A frame may not be ready yet. Continue at four frames/second. */
          }
          if (!disposed) timer = setTimeout(() => void read(), 250);
        }
        void read();
      } catch (error) {
        stop();
        if (!disposed)
          setState(
            error instanceof DOMException && error.name === "NotAllowedError"
              ? "denied"
              : "unavailable",
          );
      }
    }
    void start();
    return () => {
      disposed = true;
      stop();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [open, attempt]);
  const errorKey =
    state === "denied"
      ? "cameraDenied"
      : state === "unsupported"
        ? "cameraUnsupported"
        : "cameraUnavailable";
  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <ScanLine size={18} />
        {t("scanTicket")}
      </Button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={t("scanTicket")}
        description={t("scanHint")}
        footer={
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              {state === "read" ? luma("continue") : t("manualEntry")}
            </Button>
            {state === "read" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setAttempt((value) => value + 1)}
              >
                {t("scanAgain")}
              </Button>
            )}
          </div>
        }
      >
        <div className="ticket-scanner">
          <video
            ref={video}
            autoPlay
            muted
            playsInline
            aria-label={t("scanTicket")}
          />
          <span className="ticket-scanner-frame" aria-hidden="true">
            <Camera />
          </span>
        </div>
        <p className="mt-4 text-sm leading-7" role="status">
          {state === "read" ? (
            <>
              <Check className="inline size-4" /> {t("codeReady")}
            </>
          ) : state === "starting" ? (
            t("cameraStarting")
          ) : state === "scanning" ? (
            t("scanHint")
          ) : (
            t(errorKey)
          )}
        </p>
      </BottomSheet>
    </>
  );
}
