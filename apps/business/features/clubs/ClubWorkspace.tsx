"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { Club, ClubProfile } from "./club-store";

import { ArrowLeft } from "@repo/icons/arrow-left";
import { ArrowRight } from "@repo/icons/arrow-right";
import { ArrowUpRight } from "@repo/icons/arrow-up-right";
import { Building2 } from "@repo/icons/building-2";
import { Plus } from "@repo/icons/plus";
import { AnimatedSelectControl } from "@repo/ui/kit/select";

import { clubClasses } from "./club-classes";
import { clubAddress } from "./club-profile";
import { ClubDetails } from "./ClubDetails";
import { ClubForm } from "./ClubForm";
import { ClubLogo } from "./ClubMedia";

type WorkspaceProps = {
  id?: string;
  mode?: "create" | "edit";
};

type Setup = { id: string; profile: ClubProfile };

const ClubSetup = () => {
  const [requests, setRequests] = useState<Setup[] | null>(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/clubs/setup", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setRequests((await response.json()) as Setup[]);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, []);
  if (error) return <p role="alert">Could not load your approved requests.</p>;
  if (!requests) return <p role="status">Loading your approved requests…</p>;
  const entry = requests.find((request) => request.id === selected) ?? requests[0];
  if (!entry)
    return (
      <Link
        href={
          process.env.NEXT_PUBLIC_CLUB_APPLICATION_URL ?? "http://localhost:3000/club-registration/"
        }
      >
        Request a club
      </Link>
    );
  return (
    <>
      {requests.length > 1 && (
        <div>
          Approved request
          <AnimatedSelectControl
            value={entry.id}
            items={requests.map(({ id, profile }) => ({ value: id, label: profile.name }))}
            onChange={setSelected}
            triggerProps={{ "aria-label": "Approved request" }}
          />
        </div>
      )}
      <ClubForm key={entry.id} setup={entry} />
    </>
  );
};

export const ClubWorkspace = (props: WorkspaceProps) => {
  const { id, mode } = props;
  const [snapshot, setSnapshot] = useState<Club[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (mode === "create") return;
    const controller = new AbortController();
    void fetch("/api/clubs", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setSnapshot((await response.json()) as Club[]);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Could not load your clubs.");
      });
    return () => controller.abort();
  }, [mode]);
  const clubs = snapshot ?? [];
  const club = clubs.find((entry) => entry.id === id);

  return (
    <div
      className={clubClasses.shell}
      data-profile={mode === "create" || (Boolean(id) && mode !== "edit") || undefined}
      data-management={mode === "edit" || undefined}
    >
      <main className={clubClasses.container}>
        {mode === "create" ?
          <ClubSetup />
        : error ?
          <p role="alert">{error}</p>
        : snapshot === null ?
          <p className={clubClasses.message} role="status">
            Loading clubs…
          </p>
        : club ?
          mode === "edit" ?
            <ClubForm key={club.id} club={club} />
          : <ClubDetails club={club} />
        : id ?
          <section className={clubClasses.message}>
            <h1>Club unavailable</h1>
            <p>This club could not be found for your account.</p>
            <Link className={clubClasses.action} href="/club">
              <ArrowLeft size={16} aria-hidden /> Back to clubs
            </Link>
          </section>
        : <section className={clubClasses.directory}>
            <div className={clubClasses.headingRow}>
              <h1>Clubs</h1>
              <Link className={clubClasses.primary} href="/club/new">
                <Plus size={18} aria-hidden /> Request a club
              </Link>
            </div>
            {clubs.length ?
              <ul className={clubClasses.directoryList}>
                {clubs.map((entry) => (
                  <li key={entry.id}>
                    <Link className={clubClasses.clubRow} href={`/club/${entry.id}`}>
                      <ClubLogo name={entry.name} url={entry.logo} />
                      <span>
                        <strong>{entry.name}</strong>
                        <small>{clubAddress(entry.location)}</small>
                      </span>
                      <ArrowRight size={18} aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            : <div className={clubClasses.message}>
                <Building2 size={30} aria-hidden />
                <h2>No clubs yet</h2>
                <p>Submit a request for a club you manage.</p>
                <Link className={clubClasses.action} href="/club/new">
                  Request your first club <ArrowUpRight size={16} aria-hidden />
                </Link>
              </div>
            }
          </section>
        }
      </main>
    </div>
  );
};
