"use client";
import { useRef, useState } from "react";
import { useTranslations } from "@repo/i18n";
import {
  useSportsCommand,
  useSportsQuery,
  type ServiceDto,
} from "@repo/api/sports";
import { Button } from "../kit/Button";
import { Input } from "../kit/Input";
import { QueryError } from "./query-error";
export function MemberBenefits({
  id,
  revision,
  serviceIds,
  entryAllowed,
  org,
  branch,
}: {
  id: string;
  revision: number;
  serviceIds: string[];
  entryAllowed: boolean;
  org: string;
  branch: string;
}) {
  const t = useTranslations("Workflow"),
    [open, setOpen] = useState(false),
    key = useRef(crypto.randomUUID());
  const services = useSportsQuery<ServiceDto[]>(
    "business/sports/services",
    { organizationId: org, branchId: branch },
    open,
  );
  const command = useSportsCommand(
    `business/sports-workflows/memberships/${id}/benefits`,
  );
  return (
    <details
      className="basis-full"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>{t("benefits")}</summary>
      {open && (
        <form
          key={revision}
          className="grid gap-3 my-3 rounded-xl border p-3"
          onChange={() => {
            key.current = crypto.randomUUID();
          }}
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            command.mutate(
              {
                revision,
                serviceIds: f.getAll("services"),
                entryAllowed: f.has("entry"),
                reason: f.get("reason"),
                idempotencyKey: key.current,
              },
              { onSuccess: () => setOpen(false) },
            );
          }}
        >
          <p className="text-sm text-muted-foreground">{t("benefitsHint")}</p>
          <label className="flex gap-3 items-center">
            <input type="checkbox" name="entry" defaultChecked={entryAllowed} />
            {t("entryAllowed")}
          </label>
          {services.data
            ?.filter((s) => !["membership", "program"].includes(s.kind))
            .map((s) => (
              <label className="flex gap-3 items-center" key={s.id}>
                <input
                  type="checkbox"
                  name="services"
                  value={s.id}
                  defaultChecked={serviceIds.includes(s.id)}
                />
                {s.title}
              </label>
            ))}
          <Input
            name="reason"
            aria-label={t("reason")}
            placeholder={t("reason")}
            minLength={3}
            maxLength={1000}
            required
          />
          <Button disabled={command.isPending || !services.data} type="submit">
            {t("save")}
          </Button>
          <QueryError error={command.error ?? services.error} />
        </form>
      )}
    </details>
  );
}
