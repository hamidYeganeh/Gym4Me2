"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "@repo/i18n";
import {
  useSportsCommand,
  type ConversationDto,
  type ConversationStateDto,
  type ConversationStateInput,
} from "@repo/api/sports";
import { Button } from "../kit/Button";
import { Field, FieldGroup, FieldLabel } from "../kit/Field";
import { Textarea } from "../kit/Textarea";
import { Alert, AlertDescription } from "../kit/Alert";
import { HostSheet } from "./host-sheet";
import { QueryError } from "./query-error";
import { isActiveSurfaceElement } from "../lib/active-surface";

export function HostConversationState({
  conversation,
  reload,
  onModalChange,
}: {
  conversation: ConversationDto;
  reload(): Promise<ConversationDto | null>;
  onModalChange(open: boolean): void;
}) {
  const t = useTranslations("Luma"),
    inputId = useId();
  const [open, setOpen] = useState(false),
    [reason, setReason] = useState("");
  const [draft, setDraft] = useState({
    closed: !conversation.closed,
    revision: conversation.revision,
  });
  const [reloading, setReloading] = useState(false),
    [saved, setSaved] = useState(false);
  const key = useRef<string | null>(null),
    dialogOpen = useRef(false),
    error = useRef<HTMLDivElement>(null),
    reasonInput = useRef<HTMLTextAreaElement>(null);
  const command = useSportsCommand<
    ConversationStateDto,
    ConversationStateInput
  >(`sports/community/conversations/${conversation.id}/close`);
  const change = (value: boolean) => {
    dialogOpen.current = value;
    setOpen(value);
    onModalChange(value);
  };
  useEffect(() => {
    if (
      open &&
      command.error?.status === 409 &&
      isActiveSurfaceElement(error.current)
    )
      error.current?.focus();
  }, [open, command.error]);
  return (
    <>
      <Button
        variant="outline"
        disabled={command.isPending || reloading}
        onClick={() => {
          setDraft({
            closed: !conversation.closed,
            revision: conversation.revision,
          });
          key.current = null;
          command.reset();
          setSaved(false);
          change(true);
        }}
      >
        {conversation.closed ? t("openChat") : t("closeChat")}
      </Button>
      {saved && (
        <p role="status" className="text-sm text-muted-foreground">
          {t("conversationStateSaved")}
        </p>
      )}
      {!open && <QueryError error={command.error} />}
      <HostSheet
        open={open}
        onOpenChange={change}
        title={draft.closed ? t("closeChat") : t("openChat")}
        description={t("conversationStateHint")}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (command.isPending || reloading) return;
            key.current ??= crypto.randomUUID();
            command.mutate(
              { ...draft, reason: reason.trim(), idempotencyKey: key.current },
              {
                onSuccess: () => {
                  change(false);
                  setReason("");
                  key.current = null;
                  setSaved(true);
                },
              },
            );
          }}
        >
          <FieldGroup>
            <Field data-disabled={command.isPending || reloading}>
              <FieldLabel htmlFor={inputId}>{t("reason")}</FieldLabel>
              <Textarea
                ref={reasonInput}
                id={inputId}
                value={reason}
                minLength={3}
                maxLength={1000}
                required
                disabled={command.isPending || reloading}
                onChange={(event) => {
                  setReason(event.target.value);
                  key.current = null;
                }}
              />
            </Field>
            <Button
              type="submit"
              disabled={
                reason.trim().length < 3 || command.isPending || reloading
              }
            >
              {command.isPending ? t("saving") : t("applyConversationState")}
            </Button>
            {command.error?.status === 409 ? (
              <>
                <Alert ref={error} tabIndex={-1} variant="destructive">
                  <AlertDescription>
                    {t("conversationStateConflict")}
                  </AlertDescription>
                </Alert>
                <Button
                  type="button"
                  variant="outline"
                  disabled={reloading}
                  onClick={() => {
                    setReloading(true);
                    void reload()
                      .then((current) => {
                        if (current) {
                          setDraft((previous) => ({
                            ...previous,
                            revision: current.revision,
                          }));
                          key.current = null;
                          command.reset();
                          requestAnimationFrame(() => {
                            if (
                              dialogOpen.current &&
                              isActiveSurfaceElement(reasonInput.current)
                            )
                              reasonInput.current?.focus();
                          });
                        }
                      })
                      .finally(() => setReloading(false));
                  }}
                >
                  {t("reloadConversation")}
                </Button>
              </>
            ) : (
              <QueryError error={command.error} />
            )}
          </FieldGroup>
        </form>
      </HostSheet>
    </>
  );
}
