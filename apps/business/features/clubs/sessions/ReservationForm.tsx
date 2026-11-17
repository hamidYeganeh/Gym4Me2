import { useState } from "react";

import type { Reservation, Schedule, ScheduleClub } from "@repo/api/schedule";
import type { FormEvent } from "react";

import { occupied, useCreateReservation } from "@repo/api/schedule";
import { Button } from "@repo/ui/kit/button";
import { Field, FieldGroup, FieldLabel } from "@repo/ui/kit/field";
import { Input } from "@repo/ui/kit/input";
import { Textarea } from "@repo/ui/kit/textarea";
import { Choice, Disclosure } from "@repo/ui/lib/session-controls";

import { sessionClasses } from "./session-classes";
import { SessionPreview } from "./SessionPreview";

export const ReservationForm = (props: {
  schedule: Schedule;
  clubs: ScheduleClub[];
  initialClub?: string;
  initialSession?: string;
  onSaved: (r: Reservation) => void;
}) => {
  const { schedule, clubs, initialClub, initialSession, onSaved } = props;
  const create = useCreateReservation();
  const [clubId, setClubId] = useState(initialClub ?? clubs[0]?.id ?? "");
  const [sessionId, setSessionId] = useState(initialSession ?? "");
  const [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [notes, setNotes] = useState("");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const sessions = schedule.sessions.filter(
    // eslint-disable-next-line react-hooks/purity -- Evaluate session status against the current time.
    (s) => s.clubId === clubId && Date.parse(s.startsAt) > Date.now(),
  );
  const session = sessions.find((s) => s.id === sessionId);
  const club = clubs.find((c) => c.id === clubId);
  const spots = session ? Math.max(0, session.capacity - occupied(schedule, session.id)) : 0;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      onSaved(await create.mutateAsync({ sessionId, name, phone, notes }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this reservation.");
      setBusy(false);
    }
  }
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
      <form className={sessionClasses.form} onSubmit={(event) => void submit(event)}>
        <FieldGroup>
          <Choice
            label="Club"
            value={clubId}
            onChange={(v) => {
              setClubId(v);
              setSessionId("");
              setError("");
            }}
            items={clubs.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Choice
            label="Upcoming class or training session"
            value={sessionId}
            onChange={(v) => {
              setSessionId(v);
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
