"use client";
import { useRef } from "react";
import { useTranslations } from "@repo/i18n";
import { useSportsQuery, useSportsCommand } from "@repo/api/sports";
import { Button } from "../kit/Button";
import { Input } from "../kit/Input";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { QueryError } from "./query-error";
import { FormField } from "./shared";
type Service = { id: string; title: string; revision: number };
export function LegacyReadiness({
  org,
  branch,
}: {
  org: string;
  branch: string;
}) {
  const t = useTranslations("Closure");
  const query = useSportsQuery<{
    services: Service[];
    memberships: { id: string; title: string; displayName: string }[];
  }>("business/collections/readiness", {
    organizationId: org,
    branchId: branch,
  });
  if (
    query.error?.status === 403 ||
    !query.data ||
    (!query.data.services.length && !query.data.memberships.length)
  )
    return null;
  return (
    <section className="rounded-2xl border p-4 my-4 grid gap-3">
      <h2>{t("legacyReview")}</h2>
      <p>{t("legacyHint")}</p>
      <QueryError error={query.error} />
      {query.data.services.map((s) => (
        <Classify key={`${s.id}:${s.revision}`} service={s} />
      ))}
      {query.data.memberships.length > 0 && (
        <>
          <p>
            {t("benefitReviewCount", { count: query.data.memberships.length })}
          </p>
          <a className="underline" href="/members">
            {t("reviewBenefits")}
          </a>
        </>
      )}
    </section>
  );
}
function Classify({ service: s }: { service: Service }) {
  const w = useTranslations("Workflow"),
    key = useRef(crypto.randomUUID());
  const sports =
      useSportsQuery<{ id: string; name: string }[]>("sports/formats"),
    command = useSportsCommand(`business/collections/services/${s.id}/sport`);
  return (
    <form
      className="grid gap-3 border rounded-xl p-3 sm:grid-cols-3"
      onChange={() => {
        key.current = crypto.randomUUID();
      }}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        command.mutate({
          sportId: f.get("sport"),
          revision: s.revision,
          reason: f.get("reason"),
          idempotencyKey: key.current,
        });
      }}
    >
      <p>{s.title}</p>
      <FormField label={w("sport")}>
        <NativeSelect name="sport" required>
          <NativeSelectOption value="">{w("chooseSport")}</NativeSelectOption>
          {sports.data?.map((s) => (
            <NativeSelectOption key={s.id} value={s.id}>
              {s.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>
      <FormField label={w("reason")}>
        <Input name="reason" minLength={3} maxLength={1000} required />
      </FormField>
      <Button disabled={command.isPending || !sports.data}>{w("save")}</Button>
      <QueryError error={command.error ?? sports.error} />
    </form>
  );
}
