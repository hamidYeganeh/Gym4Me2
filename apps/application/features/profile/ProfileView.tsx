"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";

import type { Profile } from "./profile";

import { useTranslations } from "@repo/i18n";
import { Button } from "@repo/ui/kit/button";
import { Field, FieldGroup, FieldLabel } from "@repo/ui/kit/field";
import { Input } from "@repo/ui/kit/input";
import { Textarea } from "@repo/ui/kit/textarea";

import ClubIcon from "../club/ClubIcon";
import { preparePhoto, readProfile } from "./profile";
import styles from "./profile.module.css";

type Role = "athlete" | "coach";
const empty: Profile = { name: "", bio: "", focus: "", photo: "" };

function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("gym4me-profile", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("gym4me-profile", listener);
  };
}

const ProfileView = (props: { role: Role }) => {
  const t = useTranslations("Application");

  const { role } = props;
  const key = `gym4me.profile.${role}.v1`;
  const saved = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => undefined,
  );
  return (
    <main className={styles.screen} data-role={role}>
      {saved === undefined ?
        <p className="sr-only" role="status">
          {t("loadingProfile")}
        </p>
      : <ProfileContent
          role={role}
          profile={readProfile(saved)}
          save={(profile) => {
            window.localStorage.setItem(key, JSON.stringify(profile));
            window.dispatchEvent(new Event("gym4me-profile"));
          }}
        />
      }
    </main>
  );
};

const ProfileContent = (props: {
  role: Role;
  profile: Profile | null;
  save: (value: Profile) => void;
}) => {
  const t = useTranslations("Application");

  const copy = {
    athlete: {
      label: t("athlete"),
      intro: t("introduceYourselfAndShareWhatYoureTrainingFor"),
      focus: t("trainingGoal"),
      placeholder: t("egBuildStrength"),
      bio: t("shareALittleAboutYourTrainingAndInterests"),
    },
    coach: {
      label: t("fitnessCoach"),
      intro: t("introduceYourselfAndTellAthletesHowYouCoach"),
      focus: t("coachingSpecialty"),
      placeholder: t("egStrengthAndConditioning"),
      bio: t("shareYourCoachingBackgroundAndApproach"),
    },
  };
  const { role, profile, save } = props;
  const [draft, setDraft] = useState<Profile | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  const current = draft ?? profile ?? empty;
  const editing = draft !== null || profile === null;
  const details = copy[role];
  const initials = current.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join("")
    .toLocaleUpperCase();

  return (
    <form
      className={styles.content}
      onSubmit={(event) => {
        event.preventDefault();
        if (!editing || !current.name.trim() || pending) return;
        try {
          save({
            ...current,
            name: current.name.trim(),
            bio: current.bio.trim(),
            focus: current.focus.trim(),
          });
          setDraft(null);
          setError("");
        } catch {
          setError(t("couldNotSaveYourProfileOnThisDeviceYourChangesAreStillHere"));
        }
      }}
    >
      <header className={styles.toolbar}>
        {editing && profile ?
          <Button
            type="button"
            color="neutral"
            variant="text"
            radius="full"
            size="xl"
            iconOnly
            disabled={pending}
            aria-label={t("cancelEditing")}
            onClick={() => {
              setDraft(null);
              setError("");
            }}
          >
            <ClubIcon name="close" data-icon="inline-start" />
          </Button>
        : <Button asChild color="neutral" variant="text" radius="full" size="xl" iconOnly>
            <Link href="/" aria-label={t("backToHome")}>
              <ClubIcon name="back" data-icon="inline-start" />
            </Link>
          </Button>
        }
        {editing ?
          <Button
            type="submit"
            color="neutral"
            radius="full"
            size="xl"
            iconOnly
            aria-label={t("saveProfile")}
            disabled={!current.name.trim() || pending}
          >
            <ClubIcon name="check" data-icon="inline-start" />
          </Button>
        : <Button
            type="button"
            color="neutral"
            variant="text"
            radius="full"
            size="lg"
            onClick={() => setDraft(current)}
          >
            {t("editProfile")}
          </Button>
        }
      </header>
      <div className={styles.intro}>
        <div className={styles.photo}>
          <div className={styles.avatar} aria-hidden="true">
            {current.photo ?
              <Image src={current.photo} width={96} height={96} alt="" unoptimized />
            : initials || <Image src="/gym4me-logo.png" width={48} height={48} alt="" unoptimized />
            }
          </div>
          {editing && (
            <>
              <Button
                type="button"
                color="neutral"
                radius="full"
                size="sm"
                iconOnly
                className={styles.photoButton}
                disabled={pending}
                aria-label={current.photo ? t("changeProfilePhoto") : t("addProfilePhoto")}
                onClick={() => photoInput.current?.click()}
              >
                <ClubIcon name="share" data-icon="inline-start" />
              </Button>
              <input
                ref={photoInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  setPending(true);
                  setError("");
                  try {
                    const photo = await preparePhoto(file);
                    setDraft((previous) => ({ ...(previous ?? current), photo }));
                  } catch {
                    setError(t("couldNotOpenThePhoto"));
                  } finally {
                    setPending(false);
                  }
                }}
              />
            </>
          )}
        </div>
        {editing && current.photo && (
          <Button
            type="button"
            color="neutral"
            variant="text"
            radius="full"
            size="sm"
            disabled={pending}
            onClick={() => {
              setDraft({ ...current, photo: "" });
              setError("");
            }}
          >
            {t("removePhoto")}
          </Button>
        )}
        {pending && <p role="status">{t("preparingPhoto")}</p>}
        <h1>
          {editing ?
            profile ?
              t("editProfile")
            : t("completeYourProfile")
          : current.name}
        </h1>
        <p className={styles.muted}>{editing ? details.intro : details.label}</p>
      </div>
      {editing ?
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="profile-name">{t("yourName")}</FieldLabel>
            <Input
              id="profile-name"
              required
              maxLength={80}
              autoComplete="name"
              placeholder={t("yourName")}
              variant="filled"
              radius="full"
              size="xl"
              color="neutral"
              value={current.name}
              onChange={(event) => setDraft({ ...current, name: event.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-bio">{t("bio")}</FieldLabel>
            <Textarea
              id="profile-bio"
              maxLength={320}
              placeholder={details.bio}
              variant="filled"
              radius="2xl"
              color="neutral"
              value={current.bio}
              onChange={(event) => setDraft({ ...current, bio: event.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-focus">{details.focus}</FieldLabel>
            <Input
              id="profile-focus"
              maxLength={100}
              placeholder={details.placeholder}
              variant="filled"
              radius="full"
              size="xl"
              color="neutral"
              value={current.focus}
              onChange={(event) => setDraft({ ...current, focus: event.target.value })}
            />
          </Field>
        </FieldGroup>
      : (current.bio || current.focus) && (
          <dl className={styles.summary}>
            {current.bio && (
              <div>
                <dt>{t("bio")}</dt>
                <dd>{current.bio}</dd>
              </div>
            )}
            {current.focus && (
              <div>
                <dt>{details.focus}</dt>
                <dd>{current.focus}</dd>
              </div>
            )}
          </dl>
        )
      }
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </form>
  );
};

export default ProfileView;
