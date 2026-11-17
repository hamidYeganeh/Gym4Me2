import { Toast } from "@base-ui/react/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import type { FitnessSession, ScheduleClub } from "@repo/api/schedule";

import { useCreateClass } from "@repo/api/schedule";
import { Button } from "@repo/ui/kit/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@repo/ui/kit/field";
import { Input } from "@repo/ui/kit/input";
import { Textarea } from "@repo/ui/kit/textarea";
import { Choice, Disclosure, Option } from "@repo/ui/lib/session-controls";

import { sessionClasses } from "./session-classes";
import { SessionPreview } from "./SessionPreview";

const schema = z
  .object({
    clubId: z.string().min(1, "Choose a club."),
    name: z.string().trim().min(1, "Enter a class name.").max(100),
    kind: z.string().min(1),
    instructor: z.string().trim().min(1, "Enter an instructor.").max(100),
    startsAt: z
      .string()
      .refine((value) => Number.isFinite(Date.parse(value)), "Enter a valid start time."),
    endsAt: z
      .string()
      .refine((value) => Number.isFinite(Date.parse(value)), "Enter a valid end time."),
    location: z.string().trim().min(1, "Enter a location.").max(160),
    description: z.string().max(3000),
    capacity: z.number().int().min(1).max(10000),
    price: z.number().int().nonnegative(),
    approval: z.boolean(),
    waitlist: z.boolean(),
    visibility: z.string().min(1),
    cover: z.union([z.literal(""), z.url()]),
  })
  .refine(({ startsAt, endsAt }) => Date.parse(endsAt) > Date.parse(startsAt), {
    path: ["endsAt"],
    message: "End time must follow the start time.",
  });

export const SessionForm = (props: {
  clubs: ScheduleClub[];
  initialClub?: string;
  onSaved: (session: FitnessSession) => void;
}) => {
  const { clubs, initialClub, onSaved } = props;
  const create = useCreateClass();
  const toast = Toast.useToastManager();
  const defaults: z.infer<typeof schema> = {
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
  };
  const form = useForm({ defaultValues: defaults, resolver: zodResolver(schema) });
  const draft = { ...defaults, ...useWatch({ control: form.control }) };
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const club = clubs.find((c) => c.id === draft.clubId);
  const submit = form.handleSubmit(
    async (values) => {
      if (busy) return;
      setBusy(true);
      try {
        if (!club) throw new Error("Choose an available club.");
        const created = await create.mutateAsync({
          ...values,
          startsAt: new Date(values.startsAt).toISOString(),
          endsAt: new Date(values.endsAt).toISOString(),
          cover: values.cover || club.cover,
        });
        onSaved(created);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Could not save this class. Please try again.";
        setError(message);
        toast.add({ title: message, type: "error" });
        setBusy(false);
      }
    },
    (errors) => {
      const message = Object.values(errors)[0]?.message ?? "Check the class details.";
      setError(message);
      toast.add({ title: message, type: "error" });
    },
  );
  return (
    <div className={sessionClasses.editor}>
      <SessionPreview
        session={{ ...draft, cover: draft.cover || club?.cover || "" }}
        clubName={club?.name ?? ""}
      />
      <form noValidate onSubmit={(event) => void submit(event)} className={sessionClasses.form}>
        <div className={sessionClasses.twoColumns}>
          <Choice
            label="Club"
            value={draft.clubId}
            onChange={(v) =>
              form.setValue("clubId", v, { shouldValidate: form.formState.isSubmitted })
            }
            items={clubs.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Choice
            label="Visibility"
            value={draft.visibility}
            onChange={(v) =>
              form.setValue("visibility", v, { shouldValidate: form.formState.isSubmitted })
            }
            items={["Public", "Members only"].map((value) => ({ value, label: value }))}
          />
        </div>
        <FieldGroup>
          <Field data-invalid={Boolean(form.formState.errors.name)}>
            <FieldLabel htmlFor="session-name">Class or session name</FieldLabel>
            <Input
              id="session-name"
              aria-invalid={Boolean(form.formState.errors.name)}
              placeholder="e.g. Morning strength club"
              value={draft.name}
              onChange={(e) =>
                form.setValue("name", e.target.value, {
                  shouldValidate: form.formState.isSubmitted,
                })
              }
              required
              maxLength={100}
              size="xl"
            />
          </Field>
          <div className={sessionClasses.twoColumns}>
            <Choice
              label="Session type"
              value={draft.kind}
              onChange={(v) =>
                form.setValue("kind", v, { shouldValidate: form.formState.isSubmitted })
              }
              items={["Group class", "Personal training", "Open training"].map((value) => ({
                value,
                label: value,
              }))}
            />
            <Field data-invalid={Boolean(form.formState.errors.instructor)}>
              <FieldLabel htmlFor="instructor">Instructor</FieldLabel>
              <Input
                id="instructor"
                aria-invalid={Boolean(form.formState.errors.instructor)}
                value={draft.instructor}
                onChange={(e) =>
                  form.setValue("instructor", e.target.value, {
                    shouldValidate: form.formState.isSubmitted,
                  })
                }
                placeholder="Who’s leading the session?"
                required
                maxLength={100}
              />
            </Field>
          </div>
          <section className={sessionClasses.surface} aria-label="Session schedule">
            <div className={sessionClasses.twoColumns}>
              <Field data-invalid={Boolean(form.formState.errors.startsAt)}>
                <FieldLabel htmlFor="starts-at">Starts</FieldLabel>
                <Input
                  id="starts-at"
                  aria-invalid={Boolean(form.formState.errors.startsAt)}
                  type="datetime-local"
                  value={draft.startsAt}
                  onChange={(e) =>
                    form.setValue("startsAt", e.target.value, {
                      shouldValidate: form.formState.isSubmitted,
                    })
                  }
                  required
                />
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.endsAt)}>
                <FieldLabel htmlFor="ends-at">Ends</FieldLabel>
                <Input
                  id="ends-at"
                  aria-invalid={Boolean(form.formState.errors.endsAt)}
                  type="datetime-local"
                  min={draft.startsAt}
                  value={draft.endsAt}
                  onChange={(e) =>
                    form.setValue("endsAt", e.target.value, {
                      shouldValidate: form.formState.isSubmitted,
                    })
                  }
                  required
                />
              </Field>
            </div>
            <p className={sessionClasses.hint}>
              Times are in your device timezone · {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </p>
          </section>
          <Field data-invalid={Boolean(form.formState.errors.location)}>
            <FieldLabel htmlFor="session-location">Training location</FieldLabel>
            <Input
              id="session-location"
              aria-invalid={Boolean(form.formState.errors.location)}
              placeholder={club?.address || "e.g. Studio 2 · Main club"}
              value={draft.location}
              onChange={(e) =>
                form.setValue("location", e.target.value, {
                  shouldValidate: form.formState.isSubmitted,
                })
              }
              required
              maxLength={160}
            />
          </Field>
          <div className={sessionClasses.surface}>
            <Disclosure
              title="Class description"
              summary={draft.description ? "Added" : "What to expect"}
            >
              <Field data-invalid={Boolean(form.formState.errors.description)}>
                <FieldLabel htmlFor="description">Help members prepare</FieldLabel>
                <Textarea
                  id="description"
                  aria-invalid={Boolean(form.formState.errors.description)}
                  rows={5}
                  maxLength={3000}
                  placeholder="Describe the workout, fitness level, and what to bring."
                  value={draft.description}
                  onChange={(e) =>
                    form.setValue("description", e.target.value, {
                      shouldValidate: form.formState.isSubmitted,
                    })
                  }
                />
              </Field>
            </Disclosure>
            <Disclosure title="Cover image" summary={draft.cover ? "Custom cover" : "Club cover"}>
              <Field data-invalid={Boolean(form.formState.errors.cover)}>
                <FieldLabel htmlFor="cover">Image URL</FieldLabel>
                <Input
                  id="cover"
                  aria-invalid={Boolean(form.formState.errors.cover)}
                  type="url"
                  placeholder="https://…"
                  value={draft.cover}
                  onChange={(e) =>
                    form.setValue("cover", e.target.value, {
                      shouldValidate: form.formState.isSubmitted,
                    })
                  }
                />
                <FieldDescription>Leave empty to use your club’s cover.</FieldDescription>
              </Field>
            </Disclosure>
          </div>
          <section aria-labelledby="booking-options" className={sessionClasses.options}>
            <h2 id="booking-options">Booking options</h2>
            <div className={sessionClasses.surface}>
              <div className={sessionClasses.twoColumns}>
                <Field data-invalid={Boolean(form.formState.errors.capacity)}>
                  <FieldLabel htmlFor="capacity">Capacity</FieldLabel>
                  <Input
                    id="capacity"
                    aria-invalid={Boolean(form.formState.errors.capacity)}
                    type="number"
                    min={1}
                    max={10000}
                    step={1}
                    required
                    value={Number.isNaN(draft.capacity) ? "" : draft.capacity}
                    onChange={(e) =>
                      form.setValue("capacity", e.target.valueAsNumber, {
                        shouldValidate: form.formState.isSubmitted,
                      })
                    }
                  />
                </Field>
                <Field data-invalid={Boolean(form.formState.errors.price)}>
                  <FieldLabel htmlFor="price">Price per member · IRR</FieldLabel>
                  <Input
                    id="price"
                    aria-invalid={Boolean(form.formState.errors.price)}
                    type="number"
                    min={0}
                    step={1}
                    required
                    value={Number.isNaN(draft.price) ? "" : draft.price}
                    onChange={(e) =>
                      form.setValue("price", e.target.valueAsNumber, {
                        shouldValidate: form.formState.isSubmitted,
                      })
                    }
                  />
                  <FieldDescription>Set to 0 for a free session.</FieldDescription>
                </Field>
              </div>
              <Option
                label="Require approval"
                hint="Review each reservation before confirming."
                checked={draft.approval}
                onChange={(v) =>
                  form.setValue("approval", v, { shouldValidate: form.formState.isSubmitted })
                }
              />
              <Option
                label="Enable waitlist"
                hint="Keep a place in line when the class is full."
                checked={draft.waitlist}
                onChange={(v) =>
                  form.setValue("waitlist", v, { shouldValidate: form.formState.isSubmitted })
                }
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
