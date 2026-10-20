"use client";
import { useRef, useState } from "react";
import { useTranslations } from "@repo/i18n";
import {
  useAccount,
  useCoachingDashboard,
  useInviteStudent,
  useAnswerCoaching,
  useUpdateCoach,
} from "@repo/api/profile";
import { Button } from "../kit/Button";
import { Input } from "../kit/Input";
import { Textarea } from "../kit/Textarea";
import { AccountDesignPage } from "./account-design";
import { Loading, QueryError, ErrorNotice } from "./common";
import { CoachingPracticePanel } from "./practice";
import Link from "next/link";
import { PrivacyNotice } from "./privacy";

export function CoachingWorkspace() {
  const t = useTranslations("Coaching");
  const account = useAccount();
  const [page, setPage] = useState(1);
  const query = useCoachingDashboard(
    page,
    Boolean(account.data) && !account.error,
  );
  const invite = useInviteStudent();
  const answer = useAnswerCoaching();
  const update = useUpdateCoach();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<unknown>(null);
  const busy = useRef(false);
  const status = useRef<HTMLParagraphElement>(null);
  const pending = invite.isPending || answer.isPending || update.isPending;
  async function run(work: () => Promise<unknown>) {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    setMessage("");
    try {
      await work();
      setMessage(t("saved"));
      status.current?.focus();
    } catch (cause) {
      setError(cause);
    } finally {
      busy.current = false;
    }
  }
  return (
    <AccountDesignPage title={t("title")}>
      {account.isLoading ? (
        <Loading />
      ) : account.error ? (
        <QueryError error={account.error} retry={account.refetch} />
      ) : (
        <>
          <PrivacyNotice href="/profile/settings/privacy" />
          <CoachingPracticePanel />
          <p className="text-sm text-muted-foreground">{t("hint")}</p>
          <p role="status" tabIndex={-1} ref={status}>
            {message}
          </p>
          <ErrorNotice error={error} />
          {query.isLoading ? (
            <Loading />
          ) : query.error ? (
            <QueryError error={query.error} retry={query.refetch} />
          ) : (
            query.data && (
              <>
                <form
                  className="space-y-4 rounded-3xl border bg-card p-5"
                  key={query.data.profile?.updatedAt ?? "new"}
                  onSubmit={(event) => {
                    event.preventDefault();
                    const biography = String(
                      new FormData(event.currentTarget).get("biography") ?? "",
                    ).trim();
                    void run(() =>
                      update.mutateAsync({ biography: biography || null }),
                    );
                  }}
                >
                  <h2 className="font-semibold">
                    {t(query.data.profile ? "coachMode" : "activate")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("activationHint")}
                  </p>
                  <label className="grid gap-2">
                    {t("biography")}
                    <Textarea
                      name="biography"
                      maxLength={5000}
                      defaultValue={query.data.profile?.biography ?? ""}
                    />
                  </label>
                  <Button type="submit" disabled={pending}>
                    {t(query.data.profile ? "save" : "activate")}
                  </Button>
                </form>
                {query.data.profile && (
                  <form
                    className="space-y-4 rounded-3xl border bg-card p-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = event.currentTarget;
                      const phone = String(
                        new FormData(form).get("phone") ?? "",
                      );
                      void run(async () => {
                        await invite.mutateAsync(phone);
                        form.reset();
                      });
                    }}
                  >
                    <h2 className="font-semibold">{t("invite")}</h2>
                    <p className="text-sm text-muted-foreground">
                      {t("inviteHint")}
                    </p>
                    <label className="grid gap-2">
                      {t("phone")}
                      <Input
                        name="phone"
                        type="tel"
                        autoComplete="off"
                        dir="ltr"
                        required
                        maxLength={25}
                        placeholder="09…"
                      />
                    </label>
                    <Button type="submit" disabled={pending}>
                      {t("send")}
                    </Button>
                  </form>
                )}
                <section className="space-y-4" aria-label={t("relationships")}>
                  <h2 className="font-semibold">{t("relationships")}</h2>
                  {!query.data.items.length && <p>{t("empty")}</p>}
                  {query.data.items.map((row) => {
                    const student = row.studentId === account.data?.id;
                    const recipient =
                      row.initiatedBy === row.studentId
                        ? row.coachId
                        : row.studentId;
                    const answerable = recipient === account.data?.id;
                    return (
                      <article
                        key={row.id}
                        className="space-y-3 rounded-3xl border bg-card p-5"
                      >
                        <h3 className="font-semibold">
                          {row.counterpartName || t("unnamed")}
                        </h3>
                        <p className="text-sm">
                          {t(student ? "yourCoach" : "yourStudent")} ·{" "}
                          {t(row.expired ? "expired" : row.status)}
                        </p>
                        {row.status === "pending" &&
                          answerable &&
                          !row.expired && (
                            <p className="text-sm text-muted-foreground">
                              {t("consent")}
                            </p>
                          )}
                        {["active", "ended"].includes(row.status) && (
                          <p className="text-sm text-muted-foreground">
                            {t("endBookingPolicy")}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {row.status === "active" && (
                            <Button asChild variant="outline">
                              <Link href={`/coaching/student?id=${row.id}`}>
                                {t("assessment")}
                              </Link>
                            </Button>
                          )}
                          {row.status === "pending" &&
                            answerable &&
                            !row.expired &&
                            (["accept", "decline"] as const).map((action) => (
                              <Button
                                key={action}
                                variant={
                                  action === "accept" ? "default" : "outline"
                                }
                                disabled={pending}
                                onClick={() =>
                                  void run(() =>
                                    answer.mutateAsync({
                                      id: row.id,
                                      action,
                                      revision: row.revision,
                                    }),
                                  )
                                }
                              >
                                {t(action)}
                              </Button>
                            ))}
                          {(row.status === "active" ||
                            (row.status === "pending" && !answerable)) && (
                            <Button
                              variant="outline"
                              disabled={pending}
                              onClick={() =>
                                void run(() =>
                                  answer.mutateAsync({
                                    id: row.id,
                                    action: "end",
                                    revision: row.revision,
                                  }),
                                )
                              }
                            >
                              {t(row.status === "active" ? "end" : "cancel")}
                            </Button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={page === 1 || pending}
                      onClick={() => setPage(page - 1)}
                    >
                      {t("previous")}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!query.data.hasMore || pending}
                      onClick={() => setPage(page + 1)}
                    >
                      {t("next")}
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={query.isFetching || pending}
                      onClick={() => void query.refetch()}
                    >
                      {t("refresh")}
                    </Button>
                  </div>
                </section>
              </>
            )
          )}
        </>
      )}
    </AccountDesignPage>
  );
}
