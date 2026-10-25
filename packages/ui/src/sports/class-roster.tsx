"use client";
import { useRef, useState } from "react";
import { useTranslations } from "@repo/i18n";
import { useSportsQuery, useSportsCommand } from "@repo/api/sports";
import { Button } from "../kit/Button";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { QueryError } from "./query-error";
type RosterRow = {
  id: string;
  revision: number;
  displayName: string;
  status: string;
  checkedInAt: string | null;
  attendance: string | null;
  paymentStatus: string;
};
export function ClassRoster({
  occurrenceId,
  business = false,
}: {
  occurrenceId: string;
  business?: boolean;
}) {
  const t = useTranslations("Workflow"),
    [open, setOpen] = useState(false),
    [changes, setChanges] = useState<Record<string, boolean>>({});
  const key = useRef(crypto.randomUUID());
  const root = `${business ? "business" : "profile"}/sports-workflows/${business ? "" : "coach/"}occurrences/${occurrenceId}`;
  const query = useSportsQuery<RosterRow[]>(`${root}/roster`, undefined, open);
  const command = useSportsCommand(`${root}/rollcall`);
  return (
    <section className="my-4">
      <Button
        variant="outline"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {t("rollcall")}
      </Button>
      {open && (
        <div className="rounded-2xl border p-4 mt-3 grid gap-3">
          <QueryError error={query.error} retry={query.refetch} />
          {query.data?.map((r) => (
            <article key={r.id} className="grid gap-2 border-b pb-3">
              <p>
                {r.displayName}
                {r.checkedInAt && (
                  <span className="text-sm text-muted-foreground">
                    {" "}
                    · {t("checkedIn")}
                  </span>
                )}
              </p>
              <NativeSelect
                aria-label={`${t("rollcall")} ${r.displayName}`}
                value={
                  Object.hasOwn(changes, r.id)
                    ? changes[r.id]
                      ? "present"
                      : "absent"
                    : "unchanged"
                }
                disabled={r.paymentStatus !== "paid"}
                onChange={(e) => {
                  key.current = crypto.randomUUID();
                  setChanges((old) => {
                    const next = { ...old };
                    if (e.target.value === "unchanged") delete next[r.id];
                    else next[r.id] = e.target.value === "present";
                    return next;
                  });
                }}
              >
                <NativeSelectOption value="unchanged">
                  {r.attendance
                    ? t(r.attendance === "present" ? "present" : "absent")
                    : t("notStarted")}
                </NativeSelectOption>
                <NativeSelectOption value="present">
                  {t("present")}
                </NativeSelectOption>
                <NativeSelectOption value="absent">
                  {t("absent")}
                </NativeSelectOption>
              </NativeSelect>
              {r.status === "no_show" && (
                <MakeupSession
                  root={`${business ? "business" : "profile"}/sports-workflows/${business ? "" : "coach/"}`}
                  occurrenceId={occurrenceId}
                  reservation={r}
                />
              )}
            </article>
          ))}
          <Button
            disabled={!Object.keys(changes).length || command.isPending}
            onClick={() =>
              command.mutate(
                {
                  changes: query.data
                    ?.filter((r) => Object.hasOwn(changes, r.id))
                    .map((r) => ({
                      reservationId: r.id,
                      present: changes[r.id],
                      revision: r.revision,
                    })),
                  idempotencyKey: key.current,
                },
                {
                  onSuccess: () => {
                    setChanges({});
                    key.current = crypto.randomUUID();
                  },
                },
              )
            }
          >
            {t("saveRollcall")}
          </Button>
          <QueryError error={command.error} />
        </div>
      )}
    </section>
  );
}
export function MakeupSession({
  root,
  occurrenceId,
  reservation: r,
}: {
  root: string;
  occurrenceId: string;
  reservation: RosterRow;
}) {
  const t = useTranslations("Workflow");
  const query = useSportsQuery<{ id: string; startAt: string }[]>(
    `${root}occurrences/${occurrenceId}/options`,
  );
  const command = useSportsCommand(`${root}reservations/${r.id}/makeup`);
  const key = useRef(crypto.randomUUID());
  return (
    <details>
      <summary>{t("makeup")}</summary>
      <form
        className="grid gap-3 my-3"
        onChange={() => {
          key.current = crypto.randomUUID();
        }}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          command.mutate({
            targetOccurrenceId: f.get("target"),
            revision: r.revision,
            reason: f.get("reason"),
            idempotencyKey: key.current,
          });
        }}
      >
        <NativeSelect name="target" aria-label={t("makeupTarget")} required>
          <NativeSelectOption value="">{t("makeupTarget")}</NativeSelectOption>
          {query.data?.map((o) => (
            <NativeSelectOption key={o.id} value={o.id}>
              {new Date(o.startAt).toLocaleString()}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <input
          name="reason"
          aria-label={t("reason")}
          minLength={3}
          maxLength={1000}
          required
        />
        <Button disabled={command.isPending} type="submit">
          {t("save")}
        </Button>
        <QueryError error={command.error ?? query.error} />
      </form>
    </details>
  );
}
