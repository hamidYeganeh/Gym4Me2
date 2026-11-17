import { Toast } from "@base-ui/react/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import type { Reservation, Schedule, ScheduleClub } from "@repo/api/schedule";

import { occupied, useCreateReservation } from "@repo/api/schedule";
import { Button } from "@repo/ui/kit/button";
import { Field, FieldGroup, FieldLabel } from "@repo/ui/kit/field";
import { Input } from "@repo/ui/kit/input";
import { Textarea } from "@repo/ui/kit/textarea";
import { Choice, Disclosure } from "@repo/ui/lib/session-controls";

import { normalizeIranianMobile } from "../../../lib/phone";
import { sessionClasses } from "./session-classes";
import { SessionPreview } from "./SessionPreview";

const schema = z.object({
  clubId: z.string().min(1, "Choose a club."),
  sessionId: z.string().min(1, "Choose a session."),
  name: z.string().trim().min(1, "Enter the member’s name.").max(120),
  phone: z
    .string()
    .trim()
    .refine((value) => Boolean(normalizeIranianMobile(value)), "Enter a valid mobile number."),
  notes: z.string().trim().max(2000),
});

export const ReservationForm = (props: {
  schedule: Schedule;
  clubs: ScheduleClub[];
  initialClub?: string;
  initialSession?: string;
  onSaved: (r: Reservation) => void;
}) => {
  const { schedule, clubs, initialClub, initialSession, onSaved } = props;
  const create = useCreateReservation();
  const toast = Toast.useToastManager();
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      clubId: initialClub ?? clubs[0]?.id ?? "",
      sessionId: initialSession ?? "",
      name: "",
      phone: "",
      notes: "",
    },
  });
  const { clubId, sessionId } = useWatch({ control: form.control });
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const sessions = schedule.sessions.filter(
    // eslint-disable-next-line react-hooks/purity -- Evaluate session status against the current time.
    (s) => s.clubId === clubId && Date.parse(s.startsAt) > Date.now(),
  );
  const session = sessions.find((s) => s.id === sessionId);
  const club = clubs.find((c) => c.id === clubId);
  const spots = session ? Math.max(0, session.capacity - occupied(schedule, session.id)) : 0;
  const submit = form.handleSubmit(
    async ({ sessionId, name, phone, notes }) => {
      if (busy) return;
      setBusy(true);
      setError("");
      try {
        onSaved(await create.mutateAsync({ sessionId, name, phone, notes }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not save this reservation.";
        setError(message);
        toast.add({ title: message, type: "error" });
        setBusy(false);
      }
    },
    (errors) => {
      const message = Object.values(errors)[0]?.message ?? "Check the reservation details.";
      setError(message);
      toast.add({ title: message, type: "error" });
    },
  );
  return (
    <div className={sessionClasses.editor}>
      {session ?
        <SessionPreview session={session} clubName={club?.name ?? ""} />
      : <aside className={sessionClasses.reservationIntro}>
          <span className={sessionClasses.eyebrow}>A SPOT TO SHOW UP.</span>
          <h2>Good habits start with a reservation.</h2>
          <p>Choose a club and an upcoming class to see the session details and available spots.</p>
          <div className={sessionClasses.introMark} aria-hidden>
            ↗
          </div>
        </aside>
      }
      <form className={sessionClasses.form} noValidate onSubmit={(event) => void submit(event)}>
        <FieldGroup>
          <Choice
            label="Club"
            value={clubId ?? ""}
            onChange={(v) => {
              form.setValue("clubId", v);
              form.setValue("sessionId", "");
              setError("");
            }}
            items={clubs.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Choice
            label="Upcoming class or training session"
            value={sessionId ?? ""}
            onChange={(v) => {
              form.setValue("sessionId", v);
              setError("");
            }}
            items={sessions.map((s) => ({
              value: s.id,
              label: s.name + " · " + new Date(s.startsAt).toLocaleString(),
            }))}
          />
          {!sessions.length && (
            <p className={sessionClasses.hint}>
              No upcoming sessions at this club. Create a class first.
            </p>
          )}
          {session && (
            <div className={sessionClasses.surface}>
              <strong>
                {spots ?
                  spots + " spots available"
                : session.waitlist ?
                  "Class full · waitlist available"
                : "Class full"}
              </strong>
              <p className={sessionClasses.hint}>
                {session.approval ?
                  "Reservations require the club’s approval."
                : "Reservations are confirmed immediately."}
              </p>
            </div>
          )}
          <section className={sessionClasses.options}>
            <h2>Member details</h2>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="member-name">Full name</FieldLabel>
                <Input
                  id="member-name"
                  autoComplete="name"
                  placeholder="Member’s full name"
                  {...form.register("name")}
                  aria-invalid={Boolean(form.formState.errors.name)}
                  required
                  maxLength={120}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="member-phone">Mobile number</FieldLabel>
                <Input
                  id="member-phone"
                  type="tel"
                  inputMode="tel"
                  dir="ltr"
                  autoComplete="tel"
                  placeholder="09123456789"
                  {...form.register("phone")}
                  aria-invalid={Boolean(form.formState.errors.phone)}
                  required
                />
              </Field>
            </FieldGroup>
          </section>
          <div className={sessionClasses.surface}>
            <Disclosure title="Reservation notes" summary="Optional">
              <Field>
                <FieldLabel htmlFor="notes">Notes for the instructor</FieldLabel>
                <Textarea
                  id="notes"
                  {...form.register("notes")}
                  aria-invalid={Boolean(form.formState.errors.notes)}
                  maxLength={2000}
                  rows={4}
                />
              </Field>
            </Disclosure>
          </div>
          {session && (
            <div className={sessionClasses.total}>
              <span>Session price</span>
              <strong>{session.price ? session.price.toLocaleString() + " IRR" : "Free"}</strong>
              <p>Payment, if applicable, is collected at the club.</p>
            </div>
          )}
        </FieldGroup>
        {error && (
          <p role="alert" className={sessionClasses.error}>
            {error}
          </p>
        )}
        <Button
          type="submit"
          size="xl"
          fullWidth
          disabled={busy || !session || (!spots && !session.waitlist)}
        >
          {busy ?
            "Saving…"
          : session && !spots && session.waitlist ?
            "Join waitlist"
          : "Create reservation"}
        </Button>
      </form>
    </div>
  );
};
