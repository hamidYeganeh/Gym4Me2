import type { FitnessSession } from "@repo/api/schedule";

import { Calendar2 } from "@repo/icons/calendar-2";
import { MapPin1 } from "@repo/icons/map-pin-1";
import { User } from "@repo/icons/user";
import { Badge } from "@repo/ui/kit/badge";

import { ClubCover } from "../ClubMedia";
import { sessionClasses } from "./session-classes";

export const SessionPreview = (props: {
  session: Omit<FitnessSession, "id">;
  clubName: string;
}) => {
  const { session, clubName } = props;
  const start = new Date(session.startsAt);
  const valid = Number.isFinite(start.getTime());
  return (
    <aside className={sessionClasses.preview} aria-label="Session preview">
      <div className={sessionClasses.poster}>
        <ClubCover url={session.cover} />
        <div className={sessionClasses.posterCaption}>
          <Badge>{session.kind}</Badge>
          <h2>{session.name || "Class name"}</h2>
          <p>{clubName || "Club name"}</p>
        </div>
      </div>
      <div className={sessionClasses.previewMeta}>
        <span className={sessionClasses.eyebrow}>Session preview</span>
        <p>
          <Calendar2 size={18} aria-hidden />
          {valid ?
            start.toLocaleString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Choose a date & time"}
        </p>
        <p>
          <MapPin1 size={18} aria-hidden />
          {session.location || "At your club"}
        </p>
        <p>
          <User size={18} aria-hidden />
          {session.instructor || "Add an instructor"}
        </p>
        <div className={sessionClasses.previewFooter}>
          <span>{session.capacity} spots</span>
          <strong>{session.price ? session.price.toLocaleString() + " IRR" : "Free"}</strong>
        </div>
      </div>
    </aside>
  );
};
