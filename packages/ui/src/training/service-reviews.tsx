"use client";
import { SuccessNotice } from "../account/common";
import { NativeSelect } from "@repo/ui/kit/NativeSelect";
import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "@repo/i18n";
import { useAccount, useTrainingQuery } from "@repo/api/profile";
import { useCreateReview } from "@repo/api/catalog";
import { Button } from "../kit/Button";
import { ErrorNotice, Loading, QueryError } from "../account/common";
import {
  TrainingCard,
  TrainingFeedback,
  useTrainingAction,
  TrainingEmpty,
} from "./common";
export function ServiceReviewForm({
  clubId,
  branchId,
}: {
  clubId: string;
  branchId: string;
}) {
  const t = useTranslations("Training"),
    account = useAccount(),
    m = useCreateReview(),
    [body, setBody] = useState(""),
    [rating, setRating] = useState(5),
    [saved, setSaved] = useState(false);
  if (!account.data)
    return (
      <Button type="button" variant="outline" asChild>
        <Link
          href={`/login?returnTo=${encodeURIComponent(`/discovery/clubs/${clubId}/reviews?branch=${branchId}`)}`}
        >
          {t("signInToReview")}
        </Link>
      </Button>
    );
  return (
    <div className="training-root">
      <details>
        <summary>{t("writeReview")}</summary>
        <form
          className="training-root"
          onSubmit={(e) => {
            e.preventDefault();
            setSaved(false);
            void m
              .mutateAsync({ id: clubId, branchId, input: { rating, body } })
              .then(() => {
                setSaved(true);
                setBody("");
              })
              .catch(() => undefined);
          }}
        >
          <p className="training-muted">{t("verifiedReviewHint")}</p>
          <ErrorNotice error={m.error} />
          <label>
            {t("rating")}
            <NativeSelect
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            >
              {[5, 4, 3, 2, 1].map((v) => (
                <option key={v} value={v}>
                  {v} / 5
                </option>
              ))}
            </NativeSelect>
          </label>
          <label>
            {t("reviewBody")}
            <textarea
              maxLength={3000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <Button type="submit" disabled={m.isPending}>
            {t("submitReview")}
          </Button>
          <SuccessNotice success={saved} message={t("reviewPending")} />
        </form>
      </details>
    </div>
  );
}
export function ReviewReportForm({
  clubId,
  branchId,
  reviewId,
  onClose,
}: {
  clubId: string;
  branchId: string;
  reviewId: string;
  onClose: () => void;
}) {
  const t = useTranslations("Training"),
    [reason, setReason] = useState(""),
    a = useTrainingAction();
  return (
    <div className="training-root">
      <form
        className="training-root"
        onSubmit={(e) => {
          e.preventDefault();
          void a.run(async () => {
            await a.mutation.mutateAsync({
              path: `catalog/clubs/${clubId}/branches/${branchId}/reviews/${reviewId}/report`,
              body: { reason },
            });
            setReason("");
          });
        }}
      >
        <TrainingFeedback action={a} />
        <label>
          {t("reportReason")}
          <textarea
            autoFocus
            value={reason}
            minLength={5}
            maxLength={1000}
            required
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <div className="training-actions">
          <Button type="submit" disabled={a.pending}>
            {t("submitReport")}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}
type Report = {
  id: string;
  reviewId: string;
  reason: string;
  status: string;
  revision: number;
  decision: string | null;
  body: string;
  reply: string | null;
  reviewStatus: string;
  history: { reason: string; status: string; at: string }[];
};
export function AdminServiceReports() {
  const t = useTranslations("Training"),
    q = useTrainingQuery<Report[]>("admin/reviews/reports");
  return (
    <div className="training-root">
      <TrainingCard title={t("serviceReports")}>
        {q.isPending ? (
          <Loading />
        ) : q.error ? (
          <QueryError error={q.error} retry={q.refetch} />
        ) : q.data?.length ? (
          q.data.map((r) => (
            <ReportDecision key={`${r.id}:${r.revision}`} report={r} />
          ))
        ) : (
          <TrainingEmpty>{t("noReports")}</TrainingEmpty>
        )}
      </TrainingCard>
    </div>
  );
}
function ReportDecision({ report: r }: { report: Report }) {
  const t = useTranslations("Training"),
    a = useTrainingAction(),
    [reason, setReason] = useState("");
  return (
    <TrainingCard>
      <p>{r.body}</p>
      {r.reply && <blockquote>{r.reply}</blockquote>}
      <p className="training-muted">
        {t("reportReason")}: {r.reason}
      </p>
      {r.history.map((h, i) => (
        <p className="training-muted" key={i}>
          {h.reason} · {t(h.status === "published" ? "visible" : "hidden")}
        </p>
      ))}
      {r.status === "open" ? (
        <form
          className="training-root"
          onSubmit={(e) => {
            e.preventDefault();
            const submitter = (e.nativeEvent as SubmitEvent)
              .submitter as HTMLButtonElement;
            void a.run(() =>
              a.mutation.mutateAsync({
                path: `admin/reviews/reports/${r.id}/resolve`,
                body: {
                  reason,
                  hidden: submitter.value === "hide",
                  revision: r.revision,
                },
              }),
            );
          }}
        >
          <TrainingFeedback action={a} />
          <label>
            {t("decisionReason")}
            <textarea
              minLength={5}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </label>
          <div className="training-actions">
            <Button type="submit" value="hide" disabled={a.pending}>
              {t("hideReview")}
            </Button>
            <Button
              type="submit"
              value="keep"
              variant="outline"
              disabled={a.pending}
            >
              {t("keepReview")}
            </Button>
          </div>
        </form>
      ) : (
        <p>
          {t("resolved")} · {r.decision}
        </p>
      )}
    </TrainingCard>
  );
}
type DemoStatus = {
  accounts: { userId: string; displayName: string | null }[];
  events: { name: string; count: number }[];
  deliveries: { id: string; channel: string; state: string; outcome: string }[];
  modes: { userId: string; channel: string; outcome: string }[];
};
export function DemoPanel() {
  const t = useTranslations("Training"),
    q = useTrainingQuery<DemoStatus>("admin/demo"),
    a = useTrainingAction();
  return (
    <div className="training-root">
      <TrainingCard title={t("demoControls")}>
        <p className="training-muted">{t("demoControlsHint")}</p>
        <TrainingFeedback action={a} />
        {q.isPending ? (
          <Loading />
        ) : q.error ? (
          <QueryError error={q.error} retry={q.refetch} />
        ) : (
          <>
            <form
              className="training-root"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void a.run(() =>
                  a.mutation.mutateAsync({
                    path: "admin/demo/scenario",
                    body: {
                      userId: f.get("userId"),
                      channel: f.get("channel"),
                      outcome: f.get("outcome"),
                    },
                  }),
                );
              }}
            >
              <label>
                {t("demoAccount")}
                <NativeSelect name="userId">
                  {q.data?.accounts.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.displayName ?? u.userId}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <label>
                {t("channel")}
                <NativeSelect name="channel">
                  <option value="sms">{t("sms")}</option>
                  <option value="push">{t("push")}</option>
                </NativeSelect>
              </label>
              <label>
                {t("scenario")}
                <NativeSelect name="outcome">
                  {(["success", "failure", "delay"] as const).map((v) => (
                    <option key={v} value={v}>
                      {t(v)}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <Button type="submit" disabled={a.pending}>
                {t("applyScenario")}
              </Button>
            </form>
            <p className="training-muted">{t("smsScenarioHint")}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void q.refetch()}
            >
              {t("refresh")}
            </Button>
            <h3>{t("deliveryHistory")}</h3>
            {q.data?.deliveries.map((d) => (
              <p key={d.id}>
                {t(d.channel as "sms" | "push")} ·{" "}
                {t(d.state as "pending" | "delivered" | "failed")}
              </p>
            ))}
            <h3>{t("funnel")}</h3>
            <dl>
              {q.data?.events.map((e) => (
                <div className="training-card-heading" key={e.name}>
                  <dt>{t(e.name as "order_created")}</dt>
                  <dd>{e.count}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </TrainingCard>
    </div>
  );
}
