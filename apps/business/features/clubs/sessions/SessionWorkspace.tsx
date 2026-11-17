"use client";

import Link from "next/link";
import { useState } from "react";

import type { FitnessSession, Reservation } from "@repo/api/schedule";

import { occupied, useSchedule } from "@repo/api/schedule";
import { ArrowLeft } from "@repo/icons/arrow-left";
import { Plus } from "@repo/icons/plus";
import { Badge } from "@repo/ui/kit/badge";
import { Button } from "@repo/ui/kit/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@repo/ui/kit/empty";

import { ReservationForm } from "./ReservationForm";
import { sessionClasses } from "./session-classes";
import { SessionForm } from "./SessionForm";

export const SessionWorkspace = (props: {
  mode?: "list" | "class" | "reservation";
  clubId?: string;
  sessionId?: string;
}) => {
  const { mode = "list", clubId, sessionId } = props;
  const scheduleQuery = useSchedule();
  const schedule = scheduleQuery.data ?? { sessions: [], reservations: [], clubs: [] };
  const clubs = schedule.clubs;
  const writableClubs = clubs.filter((club) => club.canWrite);
  const [saved, setSaved] = useState<FitnessSession | Reservation>();
  const selectedClub = clubs.find((c) => c.id === clubId);
  const sessions = schedule.sessions
    .filter((s) => !clubId || s.clubId === clubId)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const query = clubId ? "?club=" + encodeURIComponent(clubId) : "";
  return (
    <main className={sessionClasses.shell}>
      <header className={sessionClasses.header}>
        <Link href={mode === "list" ? "/club" : "/classes" + query} className={sessionClasses.back}>
          <ArrowLeft size={16} aria-hidden />
          {mode === "list" ? "Clubs" : "Classes & reservations"}
        </Link>
        <div className={sessionClasses.headingRow}>
          <div>
            <span className={sessionClasses.eyebrow}>{selectedClub?.name ?? "CLUB SCHEDULE"}</span>
            <h1>
              {saved ?
                "You’re all set."
              : mode === "class" ?
                "Create a class"
              : mode === "reservation" ?
                "Create a reservation"
              : "Classes & reservations"}
            </h1>
            <p>
              {saved ?
                "One more reason to show up."
              : mode === "class" ?
                "Bring your community together. One session at a time."
              : mode === "reservation" ?
                "Find the right session. Save a spot for a member."
              : "Make space for stronger routines."}
            </p>
          </div>
          {mode === "list" && writableClubs.length > 0 && (
            <div className={sessionClasses.actions}>
              <Button asChild variant="outlined">
                <Link href={"/reservations/new" + query}>New reservation</Link>
              </Button>
              <Button asChild>
                <Link href={"/classes/new" + query}>
                  <Plus data-icon="inline-start" />
                  Create class
                </Link>
              </Button>
            </div>
          )}
        </div>
      </header>
      {scheduleQuery.isPending ?
        <p role="status">Loading your club schedule…</p>
      : scheduleQuery.isError && !scheduleQuery.data ?
        <div role="alert" className="grid justify-items-start gap-3">
          <p>Could not load the club schedule.</p>
          <Button
            type="button"
            disabled={scheduleQuery.isFetching}
            onClick={() => void scheduleQuery.refetch()}
          >
            {scheduleQuery.isFetching ? "Loading…" : "Try again"}
          </Button>
        </div>
      : saved ?
        <section className={sessionClasses.success} role="status">
          <Badge color="success">{"status" in saved ? saved.status : "Class created"}</Badge>
          <h2>{"status" in saved ? "Reservation saved for " + saved.name : saved.name}</h2>
          <p>
            {"status" in saved ?
              saved.status === "waitlisted" ?
                "The member is on the waitlist. A spot is not yet confirmed."
              : saved.status === "pending" ?
                "This reservation is waiting for club approval."
              : "The member’s place is confirmed."
            : "Your session is ready to receive reservations."}
          </p>
          <div className={sessionClasses.actions}>
            <Button asChild>
              <Link href={"/classes" + query}>View schedule</Link>
            </Button>
            <Button type="button" variant="outlined" onClick={() => setSaved(undefined)}>
              Create another
            </Button>
          </div>
        </section>
      : !clubs.length ?
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Start with your club</EmptyTitle>
            <EmptyDescription>
              Create a club before adding its fitness classes and reservations.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/club/new">Create a club</Link>
            </Button>
          </EmptyContent>
        </Empty>
      : mode !== "list" && (!writableClubs.length || selectedClub?.canWrite === false) ?
        <p role="status">You can view this schedule. A club owner or manager can make changes.</p>
      : mode === "class" ?
        <SessionForm clubs={writableClubs} initialClub={selectedClub?.id} onSaved={setSaved} />
      : mode === "reservation" ?
        <ReservationForm
          initialSession={sessionId}
          clubs={writableClubs}
          schedule={schedule}
          initialClub={selectedClub?.id}
          onSaved={setSaved}
        />
      : <div className={sessionClasses.schedule}>
          {!sessions.length ?
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Your next great class starts here</EmptyTitle>
                <EmptyDescription>
                  Plan a group workout, personal training session, or open training time.
                </EmptyDescription>
              </EmptyHeader>
              {writableClubs.length > 0 && (
                <EmptyContent>
                  <Button asChild>
                    <Link href={"/classes/new" + query}>Create your first class</Link>
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          : sessions.map((session) => {
              const reservations = schedule.reservations.filter((r) => r.sessionId === session.id);
              return (
                <article key={session.id} className={sessionClasses.sessionCard}>
                  <div className={sessionClasses.dateTile}>
                    <span>
                      {new Date(session.startsAt).toLocaleDateString(undefined, { month: "short" })}
                    </span>
                    <strong>{new Date(session.startsAt).getDate()}</strong>
                  </div>
                  <div className={sessionClasses.sessionContent}>
                    <div className={sessionClasses.actions}>
                      <Badge>{session.kind}</Badge>
                      <Badge color="secondary">
                        {/* eslint-disable-next-line react-hooks/purity -- Evaluate session status against the current time. */}
                        {Date.parse(session.endsAt) < Date.now() ? "Past" : "Upcoming"}
                      </Badge>
                    </div>
                    <h2>{session.name}</h2>
                    <p>
                      {clubs.find((c) => c.id === session.clubId)?.name} · {session.location}
                    </p>
                    <p>
                      {new Date(session.startsAt).toLocaleString()} · {session.instructor}
                    </p>
                    <p>
                      {occupied(schedule, session.id)} / {session.capacity} spots reserved ·{" "}
                      {session.price ? session.price.toLocaleString() + " IRR" : "Free"}
                    </p>
                    {session.description && <p>{session.description}</p>}
                    {reservations.length > 0 && (
                      <details className={sessionClasses.roster}>
                        <summary>Reservations ({reservations.length})</summary>
                        <ul>
                          {reservations.map((r) => (
                            <li key={r.id}>
                              <span>
                                {r.name}
                                <small>{r.phone}</small>
                              </span>
                              <Badge>{r.status}</Badge>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                  {writableClubs.some((club) => club.id === session.clubId) && (
                    <Button asChild variant="outlined">
                      <Link
                        href={
                          "/reservations/new?club=" +
                          encodeURIComponent(session.clubId) +
                          "&session=" +
                          encodeURIComponent(session.id)
                        }
                      >
                        Reserve a spot
                      </Link>
                    </Button>
                  )}
                </article>
              );
            })
          }
        </div>
      }
    </main>
  );
};
