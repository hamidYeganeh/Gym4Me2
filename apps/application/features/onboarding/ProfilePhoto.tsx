"use client";

import { useEffect, useRef, useState } from "react";

import type { ChangeEvent } from "react";

import { useTranslations } from "@repo/i18n";
import { ArrowRotateClockwise1 } from "@repo/icons/arrow-rotate-clockwise-1";
import { ArrowRotateCounterclockwise1 } from "@repo/icons/arrow-rotate-counterclockwise-1";
import { Camera1 } from "@repo/icons/camera-1";
import { Check } from "@repo/icons/check";
import { Image1 } from "@repo/icons/image-1";
import { User } from "@repo/icons/user";
import { Button } from "@repo/ui/kit/button";
import {
  AnimatedSheet,
  AnimatedSheetContent,
  AnimatedSheetDescription,
  AnimatedSheetTitle,
  AnimatedSheetTrigger,
} from "@repo/ui/kit/sheet";

import styles from "./onboarding.module.css";

const cropSize = 384;

const PhotoCrop = (props: {
  image: HTMLImageElement;
  onApply: (photo: string) => void;
  onCancel: () => void;
}) => {
  const t = useTranslations("Application");

  const { image, onApply, onCancel } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    const scale = (cropSize / Math.min(image.naturalWidth, image.naturalHeight)) * zoom;
    context.clearRect(0, 0, cropSize, cropSize);
    context.save();
    context.translate(cropSize / 2, cropSize / 2);
    context.rotate((rotation * Math.PI) / 2);
    context.scale(scale, scale);
    context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
    context.restore();
  }, [image, rotation, zoom]);

  return (
    <div className="flex min-h-0 flex-col items-center gap-theme-4">
      <canvas
        ref={canvas}
        width={cropSize}
        height={cropSize}
        role="img"
        aria-label={t("squareProfilePhotoPreview")}
        className="aspect-square w-full max-w-theme-96 border-2 border-theme-foreground object-contain"
      />
      <label className="flex w-full max-w-theme-96 items-center gap-theme-3 text-theme-body2">
        {t("zoom")}
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(event) => setZoom(event.currentTarget.valueAsNumber)}
          className="min-w-0 flex-1 accent-theme-primary"
        />
      </label>
      <div className="flex w-full flex-wrap items-center justify-between gap-theme-2">
        <Button variant="text" color="neutral" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <div className="flex gap-theme-1">
          <Button
            variant="text"
            color="neutral"
            iconOnly
            size="lg"
            radius="full"
            aria-label={t("rotateLeft")}
            onClick={() => setRotation((value) => value - 1)}
          >
            <ArrowRotateCounterclockwise1 />
          </Button>
          <Button
            variant="text"
            color="neutral"
            iconOnly
            size="lg"
            radius="full"
            aria-label={t("rotateRight")}
            onClick={() => setRotation((value) => value + 1)}
          >
            <ArrowRotateClockwise1 />
          </Button>
        </div>
        <Button
          iconOnly
          size="lg"
          radius="full"
          aria-label={t("useCroppedPhoto")}
          onClick={() => {
            const photo = canvas.current?.toDataURL("image/webp", 0.9);
            if (photo) onApply(photo);
          }}
        >
          <Check />
        </Button>
      </div>
    </div>
  );
};

const ProfilePhoto = (props: { photo: string; onChange: (photo: string) => void }) => {
  const t = useTranslations("Application");

  const { photo, onChange } = props;
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  const selection = useRef(0);
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) {
      selection.current += 1;
      setSource(null);
      setLoading(false);
      setError("");
    }
  }

  async function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 20 * 1024 * 1024) {
      setError(t("chooseAnImageUnder20MB"));
      return;
    }

    const current = ++selection.current;
    setError("");
    setLoading(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (selection.current === current) setSource(image);
    } catch {
      if (selection.current === current) setError(t("thisPhotoCouldntBeOpenedChooseAnotherImage"));
    } finally {
      URL.revokeObjectURL(url);
      if (selection.current === current) setLoading(false);
    }
  }

  function applyPhoto(value: string) {
    onChange(value);
    changeOpen(false);
  }

  return (
    <div className="relative mx-auto w-fit">
      <div className="relative grid size-theme-20 place-items-center overflow-hidden rounded-theme-full bg-theme-primary text-theme-primary-foreground ring-1 ring-theme-border">
        {photo ?
          // eslint-disable-next-line @next/next/no-img-element -- The cropped preview is a local data URL.
          <img src={photo} alt={t("yourProfilePhoto")} className="size-full object-cover" />
        : <User className="size-theme-10" />}
      </div>
      <input
        ref={camera}
        hidden
        type="file"
        accept="image/*"
        capture="user"
        onChange={(event) => void selectPhoto(event)}
      />
      <input
        ref={library}
        hidden
        type="file"
        accept="image/*"
        onChange={(event) => void selectPhoto(event)}
      />
      <AnimatedSheet open={open} onOpenChange={changeOpen}>
        <AnimatedSheetTrigger
          render={
            <Button
              iconOnly
              radius="full"
              size="md"
              color="neutral"
              variant="outlined"
              shadow="sm"
              className="absolute -end-theme-2 -bottom-theme-1 bg-theme-background"
            />
          }
          aria-label={photo ? t("changeProfilePhoto") : t("addProfilePhoto")}
        >
          <Camera1 />
        </AnimatedSheetTrigger>
        <AnimatedSheetContent
          side="bottom"
          data-theme="dark"
          className={`${styles.cropSheet} mx-auto flex max-h-[90dvh] max-w-xl flex-col gap-theme-4 overflow-y-auto bg-theme-background p-theme-5 text-theme-foreground`}
        >
          <AnimatedSheetTitle>{source ? t("cropYourPhoto") : t("profilePhoto")}</AnimatedSheetTitle>
          <AnimatedSheetDescription className="sr-only">
            {source ?
              t("adjustTheSquareCropBeforeSaving")
            : t("takeAPhotoOrChooseOneFromYourLibrary")}
          </AnimatedSheetDescription>
          {source ?
            <PhotoCrop image={source} onApply={applyPhoto} onCancel={() => changeOpen(false)} />
          : <div className="grid gap-theme-2">
              {loading && <p role="status">{t("preparingPhoto")}</p>}
              {error && (
                <p role="alert" className="text-theme-error">
                  {error}
                </p>
              )}
              <Button
                variant="text"
                color="neutral"
                disabled={loading}
                onClick={() => camera.current?.click()}
              >
                <Camera1 data-icon="inline-start" /> {t("takePhoto")}
              </Button>
              <Button
                variant="text"
                color="neutral"
                disabled={loading}
                onClick={() => library.current?.click()}
              >
                <Image1 data-icon="inline-start" /> {t("chooseFromLibrary")}
              </Button>
              {photo && (
                <Button
                  variant="text"
                  color="error"
                  disabled={loading}
                  onClick={() => applyPhoto("")}
                >
                  {t("removePhoto")}
                </Button>
              )}
            </div>
          }
        </AnimatedSheetContent>
      </AnimatedSheet>
    </div>
  );
};

export default ProfilePhoto;
