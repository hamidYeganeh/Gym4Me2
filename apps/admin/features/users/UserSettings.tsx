"use client";

import { Toast } from "@base-ui/react/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import type { Profile } from "./profile-schema";
import type { ChangeEvent, ReactNode } from "react";

import { useTranslations } from "@repo/i18n";
import { ArrowUp } from "@repo/icons/arrow-up";
import { Briefcase2 } from "@repo/icons/briefcase-2";
import { Camera2 } from "@repo/icons/camera-2";
import { Check } from "@repo/icons/check";
import { CloseX } from "@repo/icons/close-x";
import { Globe } from "@repo/icons/globe";
import { LetterX } from "@repo/icons/letter-x";
import { MusicNote2 } from "@repo/icons/music-note-2";
import { PlayCircle } from "@repo/icons/play-circle";
import { Plus } from "@repo/icons/plus";
import { User } from "@repo/icons/user";
import { UserCheck } from "@repo/icons/user-check";
import { AnimatedButton } from "@repo/ui/kit/button";
import { Field, FieldDescription, FieldLabel } from "@repo/ui/kit/field";
import { Input } from "@repo/ui/kit/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@repo/ui/kit/input-group";
import { Separator } from "@repo/ui/kit/separator";
import { Textarea } from "@repo/ui/kit/textarea";

import { normalizeIranianMobile } from "../../lib/phone";
import { createProfileSchema, emptyProfile } from "./profile-schema";

const socials = [
  { name: "instagram", prefix: "instagram.com/", icon: Camera2 },
  { name: "x", prefix: "x.com/", icon: LetterX },
  { name: "youtube", prefix: "youtube.com/@", icon: PlayCircle },
  { name: "tiktok", prefix: "tiktok.com/@", icon: MusicNote2 },
  { name: "linkedin", prefix: "linkedin.com", icon: Briefcase2 },
  { name: "website", prefix: "", icon: Globe },
] as const;

const ProfileField = (props: {
  name: string;
  label: string;
  error?: string;
  children: ReactNode;
  hiddenLabel?: boolean;
}) => {
  const { name, label, error, children, hiddenLabel } = props;
  return (
    <Field className="flex min-w-0 flex-col gap-2" data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={name} className={hiddenLabel ? "sr-only" : undefined}>
        {label}
      </FieldLabel>
      {children}
      {error && (
        <FieldDescription id={name + "-error"} className="text-sm text-theme-error">
          {error}
        </FieldDescription>
      )}
    </Field>
  );
};

function fieldState(name: string, error?: string) {
  return {
    id: name,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? name + "-error" : undefined,
  };
}

const saveIconClass =
  "[grid-area:1/1] transition-[opacity,filter,transform] duration-(--icon-swap-dur) ease-(--icon-swap-ease) will-change-[opacity,filter,transform] data-[visible=false]:opacity-0 data-[visible=false]:blur-(--icon-swap-blur) data-[visible=false]:[transform:scale(var(--icon-swap-start-scale))] motion-reduce:transition-none";

export const UserSettings = (props: { panel: "admin" | "business"; userId: string }) => {
  const { panel, userId } = props;
  const t = useTranslations("UserSettings");
  const toast = Toast.useToastManager();
  const schema = createProfileSchema((key) => t(`validation.${key}`));
  const storageKey = `gym4me:profile:${panel}:${userId}`;
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const [pictureError, setPictureError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<Profile>({ defaultValues: emptyProfile, resolver: zodResolver(schema) });
  const { fields, append, remove } = useFieldArray({ control, name: "phones" });
  const avatar = useWatch({ control, name: "avatar" });
  const loadError = t("validation.load");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = createProfileSchema(() => "").safeParse({
          phones: [],
          ...JSON.parse(stored),
        });
        if (parsed.success) reset(parsed.data);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate the saved profile from browser storage after mount.
        else setNotice(loadError);
      }
    } catch {
      setNotice(loadError);
    }
    setReady(true);
  }, [storageKey, loadError, reset]);

  function save(profile: Profile) {
    if (uploading) return;
    try {
      profile = {
        ...profile,
        phones: profile.phones.map(({ number }) => ({
          number: normalizeIranianMobile(number) ?? number,
        })),
      };
      localStorage.setItem(storageKey, JSON.stringify(profile));
      window.dispatchEvent(new Event("gym4me:profiles"));
      reset(profile);
      setNotice("");
      setSaved(true);
    } catch {
      setNotice(t("validation.storage"));
      toast.add({ title: t("validation.storage"), type: "error" });
    }
  }

  async function uploadPicture(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const invalidPicture = t("validation.picture");
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 1024 * 1024 ||
      !file.size
    ) {
      setPictureError(invalidPicture);
      return;
    }
    setPictureError("");
    setUploading(true);
    try {
      const reader = new FileReader();
      const image = await new Promise<string>((resolve, reject) => {
        reader.onload = () =>
          typeof reader.result === "string" ? resolve(reader.result) : reject();
        reader.onerror = reject;
        reader.onabort = reject;
        reader.readAsDataURL(file);
      });
      await createImageBitmap(file).then((bitmap) => bitmap.close());
      setValue("avatar", image, { shouldDirty: true });
    } catch {
      setPictureError(invalidPicture);
    } finally {
      setUploading(false);
    }
  }

  const didSave = saved && !isDirty;
  const status = didSave ? t("saved") : notice || t("local");
  return (
    <main
      data-profile-theme
      className="group/profile min-h-screen bg-theme-background text-theme-foreground scheme-dark"
    >
      <header className="border-b border-theme-border">
        <div className="mx-auto flex max-w-[66.5rem] flex-col gap-5 px-5 pt-12 sm:px-8 sm:pt-24">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.5rem]">{t("title")}</h1>
          <nav aria-label={t("title")} className="flex gap-6 text-base">
            <a
              href="#profile"
              className="inline-flex min-h-11 items-center border-b-2 border-theme-foreground py-3 group-has-[#phones:target]/profile:border-transparent group-has-[#phones:target]/profile:text-theme-muted-foreground"
            >
              {t("account")}
            </a>
            <a
              href="#phones"
              className="inline-flex min-h-11 items-center border-b-2 border-transparent py-3 text-theme-muted-foreground group-has-[#phones:target]/profile:border-theme-foreground group-has-[#phones:target]/profile:text-theme-foreground hover:text-theme-foreground"
            >
              {t("contact")}
            </a>
          </nav>
        </div>
      </header>

      <form
        className="mx-auto flex max-w-[66.5rem] flex-col gap-10 px-5 py-9 sm:px-8"
        onSubmit={handleSubmit(save)}
        noValidate
      >
        <section
          id="profile"
          aria-labelledby="profile-title"
          className="flex scroll-mt-6 flex-col gap-7"
        >
          <div>
            <h2 id="profile-title" className="text-2xl font-semibold">
              {t("profile")}
            </h2>
            <p className="mt-2 text-theme-muted-foreground">{t("description")}</p>
          </div>
          <fieldset disabled={!ready} className="flex min-w-0 flex-col gap-6">
            <div className="grid max-w-[49rem] gap-x-20 gap-y-6 md:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-6">
                <ProfileField name="name" label={t("name")} error={errors.name?.message}>
                  <Input
                    className="min-h-12 bg-theme-card text-base"
                    {...fieldState("name", errors.name?.message)}
                    autoComplete="off"
                    {...register("name")}
                  />
                </ProfileField>
                <ProfileField
                  name="username"
                  label={t("username")}
                  error={errors.username?.message}
                >
                  <InputGroup dir="ltr" className="overflow-hidden bg-theme-card">
                    <InputGroupAddon aria-hidden="true" className="self-stretch bg-theme-secondary">
                      @
                    </InputGroupAddon>
                    <InputGroupInput
                      className="min-h-12 text-base"
                      {...fieldState("username", errors.username?.message)}
                      autoComplete="off"
                      {...register("username")}
                    />
                  </InputGroup>
                </ProfileField>
                <ProfileField name="bio" label={t("bio")} error={errors.bio?.message}>
                  <Textarea
                    className="min-h-20 bg-theme-card text-base"
                    {...fieldState("bio", errors.bio?.message)}
                    rows={2}
                    placeholder={t("bioPlaceholder")}
                    {...register("bio")}
                  />
                </ProfileField>
              </div>

              <div className="flex flex-col items-start gap-2 md:col-start-2 md:row-start-1">
                <span className="text-sm font-medium">{t("picture")}</span>
                <div className="relative grid size-32 place-items-center rounded-full border border-theme-border bg-theme-card text-theme-accent">
                  {avatar ?
                    <div
                      role="img"
                      aria-label={t("picture")}
                      className="size-full rounded-full bg-cover bg-center"
                      style={{ backgroundImage: `url("${avatar}")` }}
                    />
                  : <User aria-hidden="true" className="size-9" />}
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    onChange={uploadPicture}
                  />
                  <AnimatedButton
                    type="button"
                    className="absolute end-0 bottom-0 min-h-11 min-w-11 ring-2 ring-theme-background"
                    iconOnly
                    size="sm"
                    radius="full"
                    color="neutral"
                    disabled={uploading}
                    aria-label={t("upload")}
                    aria-describedby={pictureError ? "picture-error" : undefined}
                    onClick={() => fileInput.current?.click()}
                  >
                    <ArrowUp data-icon="inline-start" />
                  </AnimatedButton>
                </div>
                {pictureError && (
                  <p id="picture-error" role="alert" className="text-sm text-theme-error">
                    {pictureError}
                  </p>
                )}
              </div>
            </div>

            <fieldset className="grid max-w-[49rem] min-w-0 gap-x-5 gap-y-5 md:grid-cols-2">
              <legend className="mb-2 text-sm font-medium">{t("social")}</legend>
              {socials.map(({ name, prefix, icon: Icon }) => (
                <div key={name} className="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] gap-3">
                  <Icon aria-hidden="true" className="mt-4 size-4 text-theme-muted-foreground" />
                  <ProfileField
                    name={name}
                    label={t(name)}
                    error={errors[name]?.message}
                    hiddenLabel
                  >
                    <InputGroup dir="ltr" className="overflow-hidden bg-theme-card">
                      {prefix && (
                        <InputGroupAddon
                          aria-hidden="true"
                          className="self-stretch bg-theme-secondary"
                        >
                          {prefix}
                        </InputGroupAddon>
                      )}
                      <InputGroupInput
                        className="min-h-12 text-base"
                        {...fieldState(name, errors[name]?.message)}
                        placeholder={
                          name === "website" ? t("website")
                          : name === "linkedin" ?
                            "/in/handle"
                          : t("handle")
                        }
                        {...register(name)}
                      />
                    </InputGroup>
                  </ProfileField>
                </div>
              ))}
            </fieldset>
            <div className="flex flex-wrap items-center gap-3">
              <AnimatedButton
                type="submit"
                color="primary"
                className="min-h-11"
                disabled={!isDirty || uploading}
              >
                <span className="relative inline-grid" aria-hidden="true">
                  <span className={saveIconClass} data-visible={!didSave}>
                    <UserCheck data-icon="inline-start" />
                  </span>
                  <span className={saveIconClass} data-visible={didSave}>
                    <Check data-icon="inline-start" />
                  </span>
                </span>
                {t("save")}
              </AnimatedButton>
              <p role="status" className="text-sm text-theme-muted-foreground">
                {status}
              </p>
            </div>
          </fieldset>
        </section>

        <Separator />

        <section
          id="phones"
          aria-labelledby="phones-title"
          className="flex scroll-mt-6 flex-col gap-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="phones-title" className="text-2xl font-semibold">
                {t("contact")}
              </h2>
              <p className="mt-2 text-theme-muted-foreground">{t("phonesDescription")}</p>
            </div>
            <AnimatedButton
              color="neutral"
              variant="outlined"
              className="min-h-11"
              size="sm"
              disabled={!ready}
              onClick={() => append({ number: "" })}
            >
              <Plus data-icon="inline-start" />
              {t("addPhone")}
            </AnimatedButton>
          </div>
          {fields.map((field, index) => {
            const name = `phones.${index}.number` as const;
            const error = errors.phones?.[index]?.number?.message;
            return (
              <div
                key={field.id}
                className="grid max-w-sm grid-cols-[minmax(0,1fr)_auto] items-start gap-2"
              >
                <ProfileField name={name} label={t("phone")} error={error} hiddenLabel>
                  <Input
                    className="min-h-12 bg-theme-card text-base"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    dir="ltr"
                    placeholder={t("phone")}
                    {...fieldState(name, error)}
                    {...register(name)}
                  />
                </ProfileField>
                <AnimatedButton
                  color="neutral"
                  variant="text"
                  className="size-11 sm:size-9"
                  iconOnly
                  aria-label={t("removePhone")}
                  onClick={() => remove(index)}
                >
                  <CloseX data-icon="inline-start" />
                </AnimatedButton>
              </div>
            );
          })}
          {isDirty && (
            <AnimatedButton
              type="submit"
              color="primary"
              className="min-h-11 self-start"
              disabled={uploading}
            >
              {t("save")}
            </AnimatedButton>
          )}
        </section>
      </form>
    </main>
  );
};
