import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Club, ClubProfile } from "./club-store";
import type { FormEvent } from "react";

import { ArrowLeft } from "@repo/icons/arrow-left";
import { ArrowUpRight } from "@repo/icons/arrow-up-right";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/kit/tabs";
import { useClubResources } from "@repo/ui/lib/club-location-fields";

import { clubClasses } from "./club-classes";
import { clubAddress } from "./club-profile";
import { ClubSchedule } from "./ClubDetails";
import { ClubCover, ClubLogo, imageUrl } from "./ClubMedia";
import { ClubProfileFields, profileCatalogs } from "./ClubProfileFields";

const fields = [
  {
    name: "name",
    label: "Club name",
    placeholder: "e.g. Northside Strength",
    required: true,
    maxLength: 100,
  },
  {
    name: "description",
    label: "Description",
    placeholder: "Tell people about your club",
    required: true,
    maxLength: 1200,
  },
  {
    name: "cover",
    label: "Cover image URL",
    placeholder: "https://",
    required: false,
    maxLength: 2000,
  },
  {
    name: "logo",
    label: "Logo image URL",
    placeholder: "https://",
    required: false,
    maxLength: 2000,
  },
] as const;

const emptyProfile: ClubProfile = { name: "", location: "", description: "", cover: "", logo: "" };

export const ClubForm = (props: { club?: Club; setup?: { id: string; profile: ClubProfile } }) => {
  const { club, setup } = props;
  const router = useRouter();
  const [profile, setProfile] = useState<ClubProfile>(club ?? setup?.profile ?? emptyProfile);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { resources, error: catalogError } = useClubResources("/api/resources", profileCatalogs);
  const id = setup?.id ?? club?.id;
  const address = clubAddress(profile.location);
  const returnPath = club ? `/club/${club.id}` : "/clubs";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || uploading || !resources) return;
    const cleaned = { ...profile };
    for (const { name } of fields) cleaned[name] = profile[name].trim();
    if (!cleaned.name) {
      setError("Enter a club name.");
      return;
    }
    if ((cleaned.cover && !imageUrl(cleaned.cover)) || (cleaned.logo && !imageUrl(cleaned.logo))) {
      setError("Use an HTTP or HTTPS address for each image.");
      return;
    }
    if (typeof cleaned.location === "string" || !cleaned.sports?.length) {
      setError("Complete the location and select at least one sport.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (!id) throw new Error("Club unavailable.");
      const response = await fetch("/api/clubs/" + (setup ? "setup/" : "") + id, {
        method: setup ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...cleaned,
          title: cleaned.name,
          clubTypeId:
            cleaned.clubTypeId ??
            resources["types/club_types"].find(({ code }) => code === cleaned.type)?.id,
        }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(result?.message ?? "Club update failed.");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save the club.");
      setSaving(false);
      return;
    }
    router.push(`/club/${id}`);
  }

  const form = (
    <form className={clubClasses.form} onSubmit={submit}>
      <h2>{setup ? "Complete your club profile" : "Club profile"}</h2>
      {setup && <p>Complete the profile and send it to the admin for publication review.</p>}
      {fields.map(({ name, label, placeholder, required, maxLength }) => {
        const shared = {
          id: `club-${name}`,
          name,
          value: profile[name],
          placeholder,
          required,
          maxLength,
          onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setProfile({ ...profile, [name]: event.target.value }),
        };
        return (
          <div className={clubClasses.field} key={name}>
            <label htmlFor={shared.id}>
              {label} {!required && <span>Optional</span>}
            </label>
            {name === "description" ?
              <textarea {...shared} rows={4} />
            : <input {...shared} type={name === "cover" || name === "logo" ? "url" : "text"} />}
          </div>
        );
      })}
      {catalogError && <p role="alert">Could not load the club catalogs.</p>}
      {!resources && !catalogError && <p role="status">Loading club catalogs…</p>}
      {resources && id && (
        <ClubProfileFields
          id={id}
          profile={profile}
          resources={resources}
          onChange={setProfile}
          onUploadChange={setUploading}
          onMediaUploaded={(item) =>
            setProfile((current) => ({ ...current, gallery: [...(current.gallery ?? []), item] }))
          }
        />
      )}
      {error && (
        <p className={clubClasses.error} role="alert">
          {error}
        </p>
      )}
      <div className={clubClasses.formActions}>
        <Link className={clubClasses.action} href={returnPath} transitionTypes={["nav-back"]}>
          Cancel
        </Link>
        <button
          className={clubClasses.primary}
          type="submit"
          disabled={saving || uploading || !resources}
        >
          {saving ?
            "Saving…"
          : club ?
            "Send changes for review"
          : "Create and send for review"}
        </button>
      </div>
    </form>
  );

  if (club) {
    return (
      <section className={clubClasses.management}>
        <header className={clubClasses.managementHeader}>
          <h1>
            <ClubLogo name={profile.name} url={profile.logo} />
            {profile.name.trim() || club.name}
          </h1>
          <Link className={clubClasses.action} href={returnPath} transitionTypes={["nav-back"]}>
            Club page <ArrowUpRight size={16} aria-hidden />
          </Link>
        </header>
        <Tabs defaultValue="classes">
          <TabsList className={clubClasses.managementTabs} aria-label="Manage club">
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="classes">
            <ClubSchedule club={club} management />
          </TabsContent>
          <TabsContent value="settings" keepMounted>
            {form}
          </TabsContent>
        </Tabs>
      </section>
    );
  }

  return (
    <section className={clubClasses.editor}>
      <Link className={clubClasses.back} href={returnPath} transitionTypes={["nav-back"]}>
        <ArrowLeft size={16} aria-hidden /> Clubs
      </Link>
      <ClubCover url={profile.cover} />
      <div className={clubClasses.profile}>
        <div className={clubClasses.profileActions}>
          <ClubLogo name={profile.name} url={profile.logo} />
        </div>
        <h1>{profile.name.trim() || "Create a club"}</h1>
        {address && <p className={clubClasses.location}>{address}</p>}
        {profile.description && <p className={clubClasses.description}>{profile.description}</p>}
      </div>
      <div className={clubClasses.editorGrid}>{form}</div>
    </section>
  );
};
