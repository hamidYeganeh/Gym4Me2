import { useState } from "react";

import type { FitnessSession, ScheduleClub } from "@repo/api/schedule";
import type { FormEvent } from "react";

import { useCreateClass } from "@repo/api/schedule";
import { Button } from "@repo/ui/kit/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@repo/ui/kit/field";
import { Input } from "@repo/ui/kit/input";
import { Textarea } from "@repo/ui/kit/textarea";
import { Choice, Disclosure, Option } from "@repo/ui/lib/session-controls";

import { sessionClasses } from "./session-classes";
import { SessionPreview } from "./SessionPreview";

export const SessionForm = (props: {
  clubs: ScheduleClub[];
  initialClub?: string;
  onSaved: (session: FitnessSession) => void;
}) => {
  const { clubs, initialClub, onSaved } = props;
  const create = useCreateClass();
  const [draft, setDraft] = useState<Omit<FitnessSession, "id">>({
    clubId: initialClub ?? clubs[0]?.id ?? "",
    name: "",
    kind: "Group class",
    instructor: "",
    startsAt: "",
    endsAt: "",
    location: "",
    description: "",
    capacity: 12,
    price: 0,
    approval: false,
    waitlist: true,
    visibility: "Public",
    cover: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setError("");
  };
  const club = clubs.find((c) => c.id === draft.clubId);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (!club) throw new Error("Choose an available club.");
      const created = await create.mutateAsync({
        ...draft,
        name: draft.name.trim(),
        instructor: draft.instructor.trim(),
        location: draft.location.trim(),
        startsAt: new Date(draft.startsAt).toISOString(),
        endsAt: new Date(draft.endsAt).toISOString(),
        cover: draft.cover || club.cover,
      });
      onSaved(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this class. Please try again.");
      setBusy(false);
    }
  }
  return (
    <div className={sessionClasses.editor}>
      <SessionPreview
        session={{ ...draft, cover: draft.cover || club?.cover || "" }}
        clubName={club?.name ?? ""}
      />
      <form onSubmit={(event) => void submit(event)} className={sessionClasses.form}>
        <div className={sessionClasses.twoColumns}>
          <Choice
            label="Club"
            value={draft.clubId}
            onChange={(v) => set("clubId", v)}
            items={clubs.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Choice
            label="Visibility"
            value={draft.visibility}
            onChange={(v) => set("visibility", v)}
            items={["Public", "Members only"].map((value) => ({ value, label: value }))}
          />
        </div>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="session-name">Class or session name</FieldLabel>
            <Input
              id="session-name"
              placeholder="e.g. Morning strength club"
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              required
              maxLength={100}
              size="xl"
            />
          </Field>
          <div className={sessionClasses.twoColumns}>
            <Choice
              label="Session type"
              value={draft.kind}
              onChange={(v) => set("kind", v)}
              items={["Group class", "Personal training", "Open training"].map((value) => ({
                value,
                label: value,
              }))}
            />
            <Field>
              <FieldLabel htmlFor="instructor">Instructor</FieldLabel>
              <Input
                id="instructor"
                value={draft.instructor}
                onChange={(e) => set("instructor", e.target.value)}
                placeholder="Who’s leading the session?"
                required
                maxLength={100}
              />
            </Field>
          </div>
          <section className={sessionClasses.surface} aria-label="Session schedule">
            <div className={sessionClasses.twoColumns}>
              <Field>
                <FieldLabel htmlFor="starts-at">Starts</FieldLabel>
                <Input
                  id="starts-at"
                  type="datetime-local"
                  value={draft.startsAt}
                  onChange={(e) => set("startsAt", e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="ends-at">Ends</FieldLabel>
                <Input
                  id="ends-at"
                  type="datetime-local"
                  min={draft.startsAt}
                  value={draft.endsAt}
                  onChange={(e) => set("endsAt", e.target.value)}
                  required
                />
              </Field>
            </div>
            <p className={sessionClasses.hint}>
              Times are in your device timezone · {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </p>
          </section>
          <Field>
            <FieldLabel htmlFor="session-location">Training location</FieldLabel>
            <Input
              id="session-location"
              placeholder={club?.address || "e.g. Studio 2 · Main club"}
              value={draft.location}
              onChange={(e) => set("location", e.target.value)}
              required
              maxLength={160}
            />
          </Field>
          <div className={sessionClasses.surface}>
            <Disclosure
              title="Class description"
              summary={draft.description ? "Added" : "What to expect"}
            >
              <Field>
                <FieldLabel htmlFor="description">Help members prepare</FieldLabel>
                <Textarea
                  id="description"
                  rows={5}
                  maxLength={3000}
                  placeholder="Describe the workout, fitness level, and what to bring."
                  value={draft.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </Field>
            </Disclosure>
            <Disclosure title="Cover image" summary={draft.cover ? "Custom cover" : "Club cover"}>
              <Field>
                <FieldLabel htmlFor="cover">Image URL</FieldLabel>
                <Input
                  id="cover"
                  type="url"
                  placeholder="https://…"
                  value={draft.cover}
                  onChange={(e) => set("cover", e.target.value)}
                />
                <FieldDescription>Leave empty to use your club’s cover.</FieldDescription>
              </Field>
            </Disclosure>
          </div>
          <section aria-labelledby="booking-options" className={sessionClasses.options}>
            <h2 id="booking-options">Booking options</h2>
            <div className={sessionClasses.surface}>
              <div className={sessionClasses.twoColumns}>
                <Field>
                  <FieldLabel htmlFor="capacity">Capacity</FieldLabel>
                  <Input
                    id="capacity"
                    type="number"
                    min={1}
                    max={10000}
                    step={1}
                    required
                    value={Number.isNaN(draft.capacity) ? "" : draft.capacity}
                    onChange={(e) => set("capacity", e.target.valueAsNumber)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="price">Price per member · IRR</FieldLabel>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    step={1}
                    required
                    value={Number.isNaN(draft.price) ? "" : draft.price}
                    onChange={(e) => set("price", e.target.valueAsNumber)}
                  />
                  <FieldDescription>Set to 0 for a free session.</FieldDescription>
                </Field>
              </div>
              <Option
                label="Require approval"
                hint="Review each reservation before confirming."
                checked={draft.approval}
                onChange={(v) => set("approval", v)}
              />
              <Option
                label="Enable waitlist"
                hint="Keep a place in line when the class is full."
                checked={draft.waitlist}
                onChange={(v) => set("waitlist", v)}
              />
            </div>
          </section>
        </FieldGroup>
        {error && (
          <p role="alert" className={sessionClasses.error}>
            {error}
          </p>
        )}
        <Button type="submit" size="xl" fullWidth disabled={busy}>
          {busy ? "Creating…" : "Create class"}
        </Button>
      </form>
    </div>
  );
};
