"use client";
import { useId, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@repo/i18n";
import { FileText } from "lucide-react";
import {
  useSportsQuery,
  useSportsCommand,
  type ServiceDto,
  type DocumentDto,
} from "@repo/api/sports";
import {
  documentFileAccept,
  documentFileIssue,
  documentStatus,
} from "../../lib/document-upload";
import {
  CommandError,
  Empty,
  Field,
  LumaPage,
  QueryState,
  Row,
  Section,
  stamp,
  useLuma,
} from "./common";

export function DocumentsPage() {
  const t = useLuma();
  const locale = useLocale();
  const service = useSearchParams().get("service");
  const query = useSportsQuery<DocumentDto[]>("sports/documents");
  const requirements = useSportsQuery<ServiceDto>(
    `sports/services/${service}`,
    undefined,
    Boolean(service),
  );
  const documents =
    query.data?.filter(
      (document) => !service || document.serviceId === service,
    ) ?? [];
  return (
    <LumaPage
      title={t("documents")}
      back={
        service ? `/services/detail?id=${encodeURIComponent(service)}` : "/"
      }
    >
      <QueryState query={query}>
        {service && (
          <QueryState query={requirements}>
            {requirements.data &&
              (requirements.data.requirements.length ? (
                <Section title={t("uploadDocument")}>
                  <DocumentUpload
                    key={service}
                    service={service}
                    requirements={requirements.data.requirements}
                  />
                </Section>
              ) : (
                <p role="status" className="luma-meta">
                  {t("noRequiredDocuments")}
                </p>
              ))}
          </QueryState>
        )}
        <Section title={t("submittedDocuments")}>
          {documents.map((document) => (
            <div key={document.id}>
              <Row
                title={document.name}
                icon={<FileText size={20} />}
                meta={[
                  document.reason,
                  document.expiresAt
                    ? `${t("expires")}: ${stamp(document.expiresAt, locale)}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                state={documentStatus(document)}
              />
              <DocumentPreview id={document.id} name={document.name} />
            </div>
          ))}
          {!documents.length && (
            <Empty icon={<FileText />}>
              {t(service ? "noServiceDocuments" : "noSubmittedDocuments")}
            </Empty>
          )}
        </Section>
      </QueryState>
    </LumaPage>
  );
}

function DocumentUpload({
  service,
  requirements,
}: {
  service: string;
  requirements: string[];
}) {
  const t = useLuma();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [issue, setIssue] = useState<
    ReturnType<typeof documentFileIssue> | "documentFileRequired"
  >(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const upload = useSportsCommand("sports/documents");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (upload.isPending) return;
        const file = input.current?.files?.[0];
        const error = file ? documentFileIssue(file) : "documentFileRequired";
        if (error) {
          setIssue(error);
          input.current?.setCustomValidity(t(error));
          input.current?.reportValidity();
          return;
        }
        const form = event.currentTarget;
        const body = new FormData(form);
        body.set("serviceId", service);
        upload.mutate(body, {
          onSuccess: () => {
            form.reset();
            setIssue(null);
            setFileName(null);
          },
        });
      }}
    >
      <p className="luma-meta">{t("documentPrivacyHint")}</p>
      <Field label={t("requiredDocuments")}>
        <select name="name" required disabled={upload.isPending}>
          {requirements.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("documents")}>
        <div
          data-gym-focus-proxy=""
          className="relative rounded-2xl border border-border bg-background p-3"
        >
          <div aria-hidden="true" className="flex items-center gap-3">
            <span className="shrink-0">{t("documentChooseFile")}</span>
            <span
              className="min-w-0 truncate text-muted-foreground"
              title={fileName ?? undefined}
            >
              <bdi>{fileName ?? t("documentNoFile")}</bdi>
            </span>
          </div>
          <input
            ref={input}
            name="file"
            type="file"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            aria-label={t("documents")}
            accept={documentFileAccept}
            required
            disabled={upload.isPending}
            aria-describedby={`${id}-hint`}
            aria-invalid={Boolean(issue)}
            aria-errormessage={issue ? `${id}-error` : undefined}
            onInvalid={(event) => {
              if (event.currentTarget.validity.valueMissing) {
                event.preventDefault();
                event.currentTarget.setCustomValidity(
                  t("documentFileRequired"),
                );
                setIssue("documentFileRequired");
                event.currentTarget.focus();
              }
            }}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              setFileName(file?.name ?? null);
              const error = file ? documentFileIssue(file) : null;
              event.currentTarget.setCustomValidity(error ? t(error) : "");
              setIssue(error);
            }}
          />
        </div>
      </Field>
      <p id={`${id}-hint`} className="luma-meta">
        {t("documentFileHint")}
      </p>
      {issue && (
        <p id={`${id}-error`} role="alert" className="luma-error">
          {t(issue)}
        </p>
      )}
      <button
        type="submit"
        className="luma-cta"
        disabled={upload.isPending || Boolean(issue)}
        aria-busy={upload.isPending}
      >
        {t(upload.isPending ? "loading" : "send")}
      </button>
      {upload.isSuccess && (
        <p role="status" className="luma-meta mt-4">
          {t("documentSubmitted")}
        </p>
      )}
      <CommandError error={upload.error} />
    </form>
  );
}

function DocumentPreview({ id, name }: { id: string; name: string }) {
  const t = useLuma();
  const [requested, setRequested] = useState(false);
  const query = useSportsQuery<{ url: string }>(
    `sports/documents/${id}/preview`,
    undefined,
    requested,
  );
  return (
    <div className="flex flex-wrap gap-3 items-center px-4 pb-4">
      <button
        type="button"
        className="min-h-11 inline-flex items-center text-sm underline underline-offset-4"
        aria-label={t("documentPreviewFor", { name })}
        disabled={requested && query.isFetching}
        onClick={() => {
          if (requested) void query.refetch();
          else setRequested(true);
        }}
      >
        {t("viewDocument")}
      </button>
      {query.data?.url && !query.isFetching && (
        <a
          href={query.data.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("documentOpenFor", { name })}
          className="min-h-11 inline-flex items-center text-sm underline underline-offset-4"
        >
          {t("openDocument")}
        </a>
      )}
      <CommandError error={query.error} />
    </div>
  );
}
