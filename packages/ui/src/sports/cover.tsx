"use client";
import { SuccessNotice } from "../account/common";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "@repo/i18n";
import { useApiContext } from "@repo/api/provider";
import {
  useSportsCommand,
  useSportsQuery,
  type ServiceDto,
  type ServiceCoverDto,
  type ServiceCoverResultDto,
} from "@repo/api/sports";
import { Button } from "../kit/Button";
import { Input } from "../kit/Input";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "../kit/Field";
import { Loading } from "../account/common";
import { QueryError } from "./query-error";
import { Dumbbell } from "lucide-react";

/** Small public cover for catalog rows; a missing cover remains an honest icon. */
export function ServiceCoverThumbnail({
  cover,
}: {
  cover: ServiceCoverDto | null;
}) {
  const { api } = useApiContext();
  const [failedId, setFailedId] = useState<string | null>(null);
  if (!cover || failedId === cover.id)
    return <Dumbbell size={23} aria-hidden="true" />;
  return (
    <Image
      src={`${api.scope[1]}/sports/media/${encodeURIComponent(cover.id)}`}
      alt=""
      width={84}
      height={84}
      unoptimized
      onError={() => setFailedId(cover.id)}
    />
  );
}

function CoverImage({
  cover,
  src,
  refresh,
}: {
  cover: ServiceCoverDto;
  src: string;
  refresh?: () => void;
}) {
  const t = useTranslations("Luma");
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div role="status" className="my-4 flex flex-col items-start gap-3">
      <p>{t("serviceCoverUnavailable")}</p>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        onClick={() => {
          refresh?.();
          setFailed(false);
        }}
      >
        {t("retry")}
      </Button>
    </div>
  ) : (
    <Image
      src={src}
      alt={cover.alt}
      width={cover.width}
      height={cover.height}
      unoptimized
      loading="eager"
      className="service-cover my-5 aspect-square w-full rounded-2xl object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export function ServiceCover({
  cover,
}: {
  cover: ServiceCoverDto | null | undefined;
}) {
  const { api } = useApiContext();
  const t = useTranslations("Copy");
  if (!cover)
    return (
      <div className="service-cover-placeholder" aria-hidden="true">
        <Dumbbell size={76} strokeWidth={1.1} />
        <span dir="ltr">{t("brand")}</span>
      </div>
    );
  return (
    <CoverImage
      key={cover.id}
      cover={cover}
      src={`${api.scope[1]}/sports/media/${encodeURIComponent(cover.id)}`}
    />
  );
}

export function ServiceCoverEditor({ service }: { service: ServiceDto }) {
  const t = useTranslations("Luma");
  const upload = useSportsCommand<ServiceCoverResultDto>(
    `business/sports/services/${service.id}/cover`,
  );
  const remove = useSportsCommand<ServiceCoverResultDto>(
    `business/sports/services/${service.id}/cover/remove`,
  );
  const preview = useSportsQuery<{ url: string }>(
    `business/sports/services/${service.id}/cover/preview`,
    undefined,
    Boolean(service.cover),
  );
  const [selection, setSelection] = useState<{
    file: File;
    revision: number;
  } | null>(null);
  const uploadKey = useRef<{ fingerprint: string; key: string } | null>(null);
  const removeKey = useRef<{ revision: number; key: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const pending = upload.isPending || remove.isPending;
  useEffect(() => {
    if (upload.isSuccess || remove.isSuccess) fileInput.current?.focus();
  }, [upload.isSuccess, remove.isSuccess]);
  return (
    <section className="mt-6" aria-label={t("serviceCover")}>
      <h3 className="font-semibold">{t("serviceCover")}</h3>
      <p className="my-3 text-sm text-muted-foreground">
        {t("serviceCoverVersionHint")}
      </p>
      {service.cover && preview.isPending && <Loading />}
      {service.cover && preview.data && (
        <CoverImage
          key={`${service.cover.id}:${preview.data.url}`}
          cover={service.cover}
          src={preview.data.url}
          refresh={() => {
            void preview.refetch();
          }}
        />
      )}
      {service.cover && (
        <QueryError error={preview.error} retry={() => preview.refetch()} />
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!selection) return;
          const form = event.currentTarget;
          const fields = new FormData(form);
          const alt = String(fields.get("alt") ?? "").trim();
          const fingerprint = JSON.stringify({
            file: [
              selection.file.name,
              selection.file.size,
              selection.file.lastModified,
            ],
            alt,
            revision: selection.revision,
          });
          if (uploadKey.current?.fingerprint !== fingerprint)
            uploadKey.current = { fingerprint, key: crypto.randomUUID() };
          fields.set("file", selection.file);
          fields.set("alt", alt);
          fields.set("revision", String(selection.revision));
          fields.set("idempotencyKey", uploadKey.current.key);
          remove.reset();
          upload.mutate(fields, {
            onSuccess: () => {
              setSelection(null);
              uploadKey.current = null;
              form.reset();
            },
          });
        }}
      >
        <fieldset disabled={pending}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${service.id}-cover-file`}>
                {t("chooseServiceCover")}
              </FieldLabel>
              <Input
                ref={fileInput}
                id={`${service.id}-cover-file`}
                className="min-h-11"
                name="file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-describedby={`${service.id}-cover-hint`}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.setCustomValidity(
                    file && file.size > 10 * 1024 * 1024
                      ? t("serviceCoverFileHint")
                      : "",
                  );
                  setSelection(
                    file ? { file, revision: service.revision } : null,
                  );
                  upload.reset();
                }}
              />
              <FieldDescription id={`${service.id}-cover-hint`}>
                {t("serviceCoverFileHint")}
              </FieldDescription>
            </Field>
            {selection && (
              <Field>
                <FieldLabel htmlFor={`${service.id}-cover-alt`}>
                  {t("serviceCoverAlt")}
                </FieldLabel>
                <Input
                  id={`${service.id}-cover-alt`}
                  className="min-h-11"
                  name="alt"
                  minLength={1}
                  maxLength={280}
                  defaultValue={service.title}
                  required
                />
              </Field>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                className="min-h-11"
                disabled={!selection || pending}
              >
                {t("saveServiceCover")}
              </Button>
              {service.cover && (
                <Button
                  type="button"
                  className="min-h-11"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    if (removeKey.current?.revision !== service.revision)
                      removeKey.current = {
                        revision: service.revision,
                        key: crypto.randomUUID(),
                      };
                    upload.reset();
                    remove.mutate(
                      {
                        revision: service.revision,
                        idempotencyKey: removeKey.current.key,
                      },
                      {
                        onSuccess: () => {
                          setSelection(null);
                          fileInput.current?.form?.reset();
                        },
                      },
                    );
                  }}
                >
                  {t("removeServiceCover")}
                </Button>
              )}
            </div>
          </FieldGroup>
        </fieldset>
      </form>
      <QueryError error={upload.error ?? remove.error} />
      <SuccessNotice
        success={upload.isSuccess}
        message={t("serviceCoverSaved")}
      />
      <SuccessNotice
        success={remove.isSuccess}
        message={t("serviceCoverSaved")}
      />
    </section>
  );
}
