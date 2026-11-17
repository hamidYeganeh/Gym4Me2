"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import type { OnboardingProfile } from "./profile-storage";
import type { FormEvent } from "react";

import { useTranslations } from "@repo/i18n";
import { ArrowLeft } from "@repo/icons/arrow-left";
import { Check } from "@repo/icons/check";
import { Button, buttonVariants } from "@repo/ui/kit/button";
import { Field, FieldGroup, FieldLabel } from "@repo/ui/kit/field";
import { Input } from "@repo/ui/kit/input";
import { Textarea } from "@repo/ui/kit/textarea";

import OnboardingShell from "./OnboardingShell";
import { readOnboardingProfile, saveOnboardingProfile } from "./profile-storage";
import ProfilePhoto from "./ProfilePhoto";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

const ProfileForm = (props: { initial: OnboardingProfile | null }) => {
  const t = useTranslations("Application");

  const { initial } = props;
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [photo, setPhoto] = useState(initial?.photo ?? "");
  const [error, setError] = useState("");

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      saveOnboardingProfile({ name: name.trim(), bio: bio.trim(), photo });
      router.push("/onboarding/notifications/");
    } catch {
      setError(t("yourProfileCouldntBeSavedOnThisDeviceCheckYourBrowserStorageAndTryAgain"));
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-theme-8">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          aria-label={t("backToGym4Me")}
          className={buttonVariants({
            iconOnly: true,
            size: "lg",
            radius: "full",
            variant: "text",
            color: "neutral",
          })}
        >
          <ArrowLeft />
        </Link>
        <Button
          type="submit"
          iconOnly
          size="lg"
          radius="full"
          aria-label={t("saveProfileAndContinue")}
          disabled={!name.trim()}
        >
          <Check />
        </Button>
      </div>

      <header className="flex flex-col gap-theme-4 text-center">
        <ProfilePhoto photo={photo} onChange={setPhoto} />
        <div className="flex flex-col gap-theme-2">
          <h1 className="text-theme-h3 font-theme-semibold">{t("completeYourProfile")}</h1>
          <p className="text-theme-body1 text-theme-muted-foreground">
            {t("introduceYourselfToTheGym4MeCommunity")}
          </p>
        </div>
      </header>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="onboarding-name">{t("yourName")}</FieldLabel>
          <Input
            id="onboarding-name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            placeholder={t("yourName")}
            maxLength={80}
            required
            variant="filled"
            size="xl"
            radius="full"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="onboarding-bio">{t("bio")}</FieldLabel>
          <Textarea
            id="onboarding-bio"
            value={bio}
            onChange={(event) => setBio(event.currentTarget.value)}
            placeholder={t("shareALittleAboutHowYouLikeToTrain")}
            maxLength={280}
            variant="filled"
            size="md"
            radius="2xl"
          />
        </Field>
      </FieldGroup>
      {error && (
        <p role="alert" className="text-theme-body2 text-theme-error">
          {error}
        </p>
      )}
    </form>
  );
};

const ProfileOnboarding = () => {
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);

  return (
    <OnboardingShell patterned>
      <ProfileForm
        key={ready ? "local" : "server"}
        initial={ready ? readOnboardingProfile() : null}
      />
    </OnboardingShell>
  );
};

export default ProfileOnboarding;
