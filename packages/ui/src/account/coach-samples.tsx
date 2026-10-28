"use client";
import { useApiContext } from "@repo/api/provider";
import { usePracticeQuery, type CoachSampleDto } from "@repo/api/profile";
import { useTranslations } from "@repo/i18n";
import { useEffect, useId, useState } from "react";
import { ImageCompare } from "../kit/ImageCompare";
import { Button } from "../kit/Button";
import { Input } from "../kit/Input";
import { Field, FieldLabel } from "../kit/Field";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowHorizontalIcon,
  Trash1Icon as TrashIcon,
  Pencil1Icon as PencilIcon,
  PlusIcon,
} from "../icons";
import { Loading, QueryError } from "./common";
import { PracticeFeedback, usePracticeAction } from "./practice-forms";

const path = "profile/coaching-samples";
export function CoachSamples({ username }: { username: string }) {
  const t = useTranslations("CoachSamples");
  const { api } = useApiContext();
  const query = usePracticeQuery<CoachSampleDto[]>(
    `coaching/samples/coach/${encodeURIComponent(username)}`,
  );
  if (query.isPending) return <Loading />;
  if (query.error)
    return <QueryError error={query.error} retry={query.refetch} />;
  if (!query.data?.length) return null;
  return (
    <section className="flex flex-col gap-5" aria-label={t("title")}>
      <h2 className="text-2xl font-semibold">{t("title")}</h2>
      {query.data.map((sample, index) => (
        <figure key={sample.id} className="min-w-0 space-y-3">
          <ImageCompare
            before={`${api.scope[1]}/${sample.before}`}
            after={`${api.scope[1]}/${sample.after}`}
            description={sample.title || t("sample", { number: index + 1 })}
          />
          {sample.title && (
            <figcaption className="text-sm">{sample.title}</figcaption>
          )}
        </figure>
      ))}
    </section>
  );
}
function usePreview(file: File | undefined, fallback = "") {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }
    const value = URL.createObjectURL(file);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [file]);
  return url || fallback;
}
function SampleForm({
  sample,
  pending,
  save,
  cancel,
}: {
  sample?: CoachSampleDto;
  pending: boolean;
  save: (body: FormData) => Promise<void>;
  cancel: () => void;
}) {
  const t = useTranslations("CoachSamples"),
    id = useId();
  const [before, setBefore] = useState<File>(),
    [after, setAfter] = useState<File>();
  const beforeUrl = usePreview(before, sample?.before),
    afterUrl = usePreview(after, sample?.after);
  const [invalid, setInvalid] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!sample && (!before || !after)) return;
        if (
          [before, after].some(
            (file) =>
              file &&
              (file.size > 4 * 1024 * 1024 ||
                !["image/jpeg", "image/png", "image/webp"].includes(file.type)),
          )
        ) {
          setInvalid(true);
          return;
        }
        setInvalid(false);
        const body = new FormData(event.currentTarget);
        body.delete("before");
        body.delete("after");
        if (before) body.set("before", before);
        if (after) body.set("after", after);
        if (sample) body.set("revision", String(sample.revision));
        void save(body);
      }}
    >
      <fieldset className="space-y-4" disabled={pending}>
        <Input
          name="title"
          label={t("caption")}
          defaultValue={sample?.title ?? ""}
          maxLength={120}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${id}-before`}>{t("before")}</FieldLabel>
            <Input
              id={`${id}-before`}
              name="before"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required={!sample}
              onChange={(e) => setBefore(e.target.files?.[0])}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-after`}>{t("after")}</FieldLabel>
            <Input
              id={`${id}-after`}
              name="after"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required={!sample}
              onChange={(e) => setAfter(e.target.files?.[0])}
            />
          </Field>
        </div>
        <p className="text-sm text-muted-foreground">{t("fileHint")}</p>
        {invalid && (
          <p role="alert" className="text-sm text-destructive">
            {t("invalidFile")}
          </p>
        )}
        {beforeUrl && afterUrl && (
          <ImageCompare before={beforeUrl} after={afterUrl} />
        )}
        <div className="flex gap-2">
          <Button type="submit">{t(pending ? "saving" : "save")}</Button>
          <Button type="button" variant="ghost" onClick={cancel}>
            {t("cancel")}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
export function CoachSamplesEditor() {
  const t = useTranslations("CoachSamples");
  const query = usePracticeQuery<CoachSampleDto[]>(path);
  const action = usePracticeAction();
  const [editing, setEditing] = useState<string | null>(null);
  // Private signed previews expire after a minute; refresh while this profile is mounted.
  useEffect(() => {
    const timer = window.setInterval(() => void query.refetch(), 45_000);
    return () => clearInterval(timer);
  }, [query.refetch]);
  const items = query.data ?? [];
  const command = async (sample: CoachSampleDto, kind: string) => {
    if (
      await action.run(`${path}/${sample.id}/action`, {
        action: kind,
        revision: sample.revision,
      })
    )
      await query.refetch();
  };
  const save = (sample?: CoachSampleDto) => async (body: FormData) => {
    if (await action.run(sample ? `${path}/${sample.id}` : path, body)) {
      setEditing(null);
      await query.refetch();
    }
  };
  return (
    <section className="space-y-5" aria-label={t("title")}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <span className="text-sm text-muted-foreground">
          {t("count", { count: items.length })}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
      <PracticeFeedback action={action} />
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <QueryError error={query.error} retry={query.refetch} />
      ) : (
        <>
          {!items.length && editing !== "new" && (
            <p className="py-6 text-center text-muted-foreground">
              {t("empty")}
            </p>
          )}
          {items.map((sample, index) => (
            <article key={sample.id} className="space-y-3">
              {editing === sample.id ? (
                <SampleForm
                  key={`${sample.id}-${sample.revision}`}
                  sample={sample}
                  pending={action.pending}
                  save={save(sample)}
                  cancel={() => setEditing(null)}
                />
              ) : (
                <>
                  <ImageCompare
                    before={sample.before}
                    after={sample.after}
                    description={
                      sample.title || t("sample", { number: index + 1 })
                    }
                  />
                  <h3 className="text-sm font-medium">
                    {sample.title || t("sample", { number: index + 1 })}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      disabled={action.pending || editing !== null}
                      onClick={() => setEditing(sample.id)}
                    >
                      <PencilIcon />
                      {t("edit")}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={action.pending || editing !== null}
                      onClick={() => void command(sample, "swap")}
                    >
                      <ArrowHorizontalIcon />
                      {t("swap")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("up")}
                      disabled={
                        action.pending || editing !== null || index === 0
                      }
                      onClick={() => void command(sample, "up")}
                    >
                      <ArrowUpIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("down")}
                      disabled={
                        action.pending ||
                        editing !== null ||
                        index === items.length - 1
                      }
                      onClick={() => void command(sample, "down")}
                    >
                      <ArrowDownIcon />
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={action.pending || editing !== null}
                      onClick={() => void command(sample, "delete")}
                    >
                      <TrashIcon />
                      {t("delete")}
                    </Button>
                  </div>
                </>
              )}
            </article>
          ))}
          {editing === "new" ? (
            <SampleForm
              pending={action.pending}
              save={save()}
              cancel={() => setEditing(null)}
            />
          ) : (
            <Button
              variant="outline"
              disabled={items.length >= 5 || action.pending || editing !== null}
              onClick={() => setEditing("new")}
            >
              <PlusIcon />
              {t("add")}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
