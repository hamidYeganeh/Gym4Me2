"use client";
import { useRef } from "react";
import { useTranslations } from "@repo/i18n";
import { useSportsCommand, useSportsQuery } from "@repo/api/sports";
import { IranianDateInput } from "@repo/ui/kit/IranianDateInput";
import { CommandError, Field, LumaPage, QueryState } from "./common";
type Dependent = {
  id: string;
  name: string;
  birthDate: string;
  gender: string;
  status: string;
  revision: number;
};
export function HouseholdPage() {
  const t = useTranslations("Closure"),
    query = useSportsQuery<Dependent[]>("profile/household");
  return (
    <LumaPage title={t("household")} back="/profile">
      <p className="luma-meta">{t("householdHint")}</p>
      <DependentForm />
      <QueryState query={query}>
        {query.data?.map((d) => (
          <DependentForm key={`${d.id}:${d.revision}`} dependent={d} />
        ))}
      </QueryState>
    </LumaPage>
  );
}
function DependentForm({ dependent: d }: { dependent?: Dependent }) {
  const t = useTranslations("Closure"),
    w = useTranslations("Workflow"),
    key = useRef(crypto.randomUUID());
  const command = useSportsCommand(`profile/household${d ? `/${d.id}` : ""}`);
  return (
    <details className="luma-group my-4 p-4">
      <summary>
        {d
          ? `${d.name} · ${t(d.status === "active" ? "active" : "archived")}`
          : t("addChild")}
      </summary>
      <form
        className="grid gap-4 my-4"
        onChange={() => {
          key.current = crypto.randomUUID();
          command.reset();
        }}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          command.mutate({
            name: f.get("name"),
            birthDate: f.get("birthDate"),
            gender: f.get("gender"),
            guardianAcknowledged: f.has("acknowledged"),
            ...(d ? { revision: d.revision, status: f.get("status") } : {}),
            idempotencyKey: key.current,
          });
        }}
      >
        <Field label={w("name")}>
          <input
            name="name"
            defaultValue={d?.name}
            minLength={2}
            maxLength={120}
            required
          />
        </Field>
        <Field label={w("birthDate")}>
          <IranianDateInput
            name="birthDate"
            defaultValue={d?.birthDate}
            required
          />
        </Field>
        <Field label={w("gender")}>
          <select name="gender" defaultValue={d?.gender ?? "unspecified"}>
            {(["unspecified", "male", "female"] as const).map((g) => (
              <option key={g} value={g}>
                {w(g)}
              </option>
            ))}
          </select>
        </Field>
        {d && (
          <Field label={t("profileState")}>
            <select name="status" defaultValue={d.status}>
              <option value="active">{t("active")}</option>
              <option value="archived">{t("archived")}</option>
            </select>
          </Field>
        )}
        <label className="flex gap-3 items-start">
          <input type="checkbox" name="acknowledged" required />
          {t("guardianAcknowledged")}
        </label>
        <button
          className="luma-cta"
          disabled={command.isPending || command.isSuccess}
        >
          {w("save")}
        </button>
        <CommandError error={command.error} />
        {command.isSuccess && <p role="status">{t("profileSaved")}</p>}
      </form>
    </details>
  );
}
