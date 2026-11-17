import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import type { Club } from "./club-store";

import { ArrowLeft } from "@repo/icons/arrow-left";
import { ArrowUpRight } from "@repo/icons/arrow-up-right";
import { Dashboard } from "@repo/icons/dashboard";
import { ListThreeSquare } from "@repo/icons/list-three-square";
import { MapPin1 } from "@repo/icons/map-pin-1";
import { Plus } from "@repo/icons/plus";
import { Calendar } from "@repo/ui/kit/calendar";

import { clubClasses } from "./club-classes";
import { clubAddress } from "./club-profile";
import { ClubCover, ClubLogo } from "./ClubMedia";
import { getServerSnapshot, getSnapshot, readSchedule, subscribe } from "./sessions/session-store";

export const ClubSchedule = (props: { club: Club; management?: boolean }) => {
  const { club, management = false } = props;
  const [compact, setCompact] = useState(false);
  const [past, setPast] = useState(false);
  const [day, setDay] = useState<Date>();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // eslint-disable-next-line react-hooks/purity -- Evaluate session status against the current time.
  const now = Date.now();
  const query = `?club=${encodeURIComponent(club.id)}`;
  const sessions = readSchedule(snapshot)
    .sessions.filter(
      (session) => session.clubId === club.id && Date.parse(session.endsAt) < now === past,
    )
    .sort((a, b) => (Date.parse(a.startsAt) - Date.parse(b.startsAt)) * (past ? -1 : 1));
  const visible = sessions.filter(
    (session) => !day || new Date(session.startsAt).toDateString() === day.toDateString(),
  );

  function changePeriod(nextPast: boolean) {
    setPast(nextPast);
    setDay(undefined);
  }

  return (
    <div className={clubClasses.detailsGrid} data-management={management || undefined}>
      <section aria-labelledby="club-classes">
        <div className={clubClasses.headingRow}>
          <div className={clubClasses.classHeading}>
            <h2 id="club-classes">Classes</h2>
            {management && (
              <Link
                className={clubClasses.addClass}
                aria-label="Add class"
                href={`/classes/new${query}`}
              >
                <Plus size={16} aria-hidden />
              </Link>
            )}
          </div>
          {management ?
            <div className={clubClasses.segmented} role="group" aria-label="Class period">
              <button type="button" aria-pressed={!past} onClick={() => changePeriod(false)}>
                Upcoming
              </button>
              <button type="button" aria-pressed={past} onClick={() => changePeriod(true)}>
                Past
              </button>
            </div>
          : <div className={clubClasses.segmented} role="group" aria-label="Class layout">
              <button
                type="button"
                aria-label="Card view"
                aria-pressed={!compact}
                onClick={() => setCompact(false)}
              >
                <Dashboard size={17} aria-hidden />
              </button>
              <button
                type="button"
                aria-label="List view"
                aria-pressed={compact}
                onClick={() => setCompact(true)}
              >
                <ListThreeSquare size={17} aria-hidden />
              </button>
            </div>
          }
        </div>
        {visible.length ?
          <ol className={compact ? clubClasses.compact : clubClasses.timeline}>
            {visible.map((session, index) => {
              const start = new Date(session.startsAt);
              const last = visible[index - 1];
              const showDate =
                !last || new Date(last.startsAt).toDateString() !== start.toDateString();
              return (
                <li key={session.id} className={management ? clubClasses.managementRow : undefined}>
                  {showDate && (
                    <time className={clubClasses.date} dateTime={session.startsAt}>
                      {management ?
                        <>
                          <span>
                            {start.toDateString() === new Date(now).toDateString() ?
                              "Today"
                            : start.toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })
                            }
                          </span>
                          <span>{start.toLocaleDateString(undefined, { weekday: "long" })}</span>
                        </>
                      : start.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          weekday: "long",
                        })
                      }
                    </time>
                  )}
                  <Link
                    className={clubClasses.activityCard}
                    href={`/classes${query}&session=${encodeURIComponent(session.id)}`}
                  >
                    <div>
                      <time dateTime={session.startsAt}>
                        {start.toLocaleTimeString(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </time>
                      <h3>{session.name}</h3>
                      {session.instructor && <p>{session.instructor}</p>}
                      {session.location && (
                        <p className={clubClasses.location}>
                          <MapPin1 size={15} aria-hidden /> {session.location}
                        </p>
                      )}
                    </div>
                    {management && (
                      <span className={clubClasses.manageClass}>
                        Manage class <ArrowUpRight size={14} aria-hidden />
                      </span>
                    )}
                    {!compact && <ClubCover url={session.cover ?? ""} />}
                  </Link>
                </li>
              );
            })}
          </ol>
        : <div className={clubClasses.message}>
            <h3>
              {day ?
                "No classes on this date"
              : past ?
                "No past classes"
              : "No upcoming classes"}
            </h3>
            <Link className={clubClasses.action} href={`/classes${query}`}>
              Classes & reservations <ArrowUpRight size={16} aria-hidden />
            </Link>
          </div>
        }
      </section>
      {!management && (
        <aside className={clubClasses.schedule} aria-label="Class calendar">
          <Link className={clubClasses.addClass} href={`/classes/new${query}`}>
            <Plus size={17} aria-hidden /> Add class
          </Link>
          <div className={clubClasses.calendar}>
            <Calendar
              mode="single"
              selected={day}
              onSelect={setDay}
              modifiers={{ activity: sessions.map((session) => new Date(session.startsAt)) }}
              modifiersClassNames={{ activity: clubClasses.activityDay ?? "" }}
            />
            {day && (
              <button
                className={clubClasses.action}
                type="button"
                onClick={() => setDay(undefined)}
              >
                Show all dates
              </button>
            )}
            <div className={clubClasses.segmented} role="group" aria-label="Class period">
              <button type="button" aria-pressed={!past} onClick={() => changePeriod(false)}>
                Upcoming
              </button>
              <button type="button" aria-pressed={past} onClick={() => changePeriod(true)}>
                Past
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};

export const ClubDetails = (props: { club: Club }) => {
  const { club } = props;
  return (
    <article className={clubClasses.details}>
      <Link className={clubClasses.back} href="/clubs" transitionTypes={["nav-back"]}>
        <ArrowLeft size={16} aria-hidden /> Clubs
      </Link>
      <ClubCover url={club.cover} />
      <div className={clubClasses.profile}>
        <div className={clubClasses.profileActions}>
          <ClubLogo name={club.name} url={club.logo} />
          <Link className={clubClasses.action} href={`/club/${club.id}/edit`}>
            Manage <ArrowUpRight size={17} aria-hidden />
          </Link>
        </div>
        <h1>{club.name}</h1>
        {club.reviewStatus && (
          <p role="status">
            {club.reviewStatus === "approved" ?
              "Published in the app"
            : club.reviewStatus === "pending" ?
              "Awaiting publication review"
            : "Publication changes requested"}
            {club.publishedAt &&
              club.reviewStatus !== "approved" &&
              " · The last approved profile is live"}
          </p>
        )}
        {club.rejectionReason && <p>{club.rejectionReason}</p>}
        {clubAddress(club.location) && (
          <p className={clubClasses.location}>
            <MapPin1 size={17} aria-hidden /> {clubAddress(club.location)}
          </p>
        )}
        {club.description && <p className={clubClasses.description}>{club.description}</p>}
      </div>
      <ClubSchedule club={club} />
    </article>
  );
};
