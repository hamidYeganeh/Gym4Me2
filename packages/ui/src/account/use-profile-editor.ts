"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { Account } from "@repo/api/auth";
import { useUpdateAccount } from "@repo/api/profile";
import { useTranslations } from "@repo/i18n";
import { toast } from "sonner";
import { isActiveSurfaceElement } from "../lib/active-surface";

/** Both profile surfaces edit changed fields and reconcile confirmed server changes. */
export function useProfileEditor(account: Account) {
  const t = useTranslations();
  const mutation = useUpdateAccount();
  const id = useId();
  const nameInput = useRef<HTMLInputElement>(null);
  const pending = useRef(false);
  const attempt = useRef<{ origin: HTMLElement; path: string } | null>(null);
  const [completed, setCompleted] = useState(0);
  const observed = {
    name: account.displayName ?? "",
    isPublic: account.profilePublic ?? false,
    updatedAt: account.updatedAt ?? "",
  };
  const [draft, setDraft] = useState({
    name: observed.name,
    isPublic: observed.isPublic,
    confirmed: observed,
    observed,
  });
  // Preserve an unsaved field during unrelated refetches; honor a changed server field.
  if (
    draft.observed.name !== observed.name ||
    draft.observed.isPublic !== observed.isPublic ||
    draft.observed.updatedAt !== observed.updatedAt
  ) {
    setDraft({
      confirmed: observed,
      observed,
      name: draft.confirmed.name !== observed.name ? observed.name : draft.name,
      isPublic:
        draft.confirmed.isPublic !== observed.isPublic
          ? observed.isPublic
          : draft.isPublic,
    });
  }
  const name = draft.name.trim();
  const invalid = name.length > 100 || (name.length > 0 && name.length < 2);
  const changes = {
    ...(name !== draft.confirmed.name ? { displayName: name || null } : {}),
    ...(draft.isPublic !== draft.confirmed.isPublic
      ? { profilePublic: draft.isPublic }
      : {}),
  };
  const dirty = Object.keys(changes).length > 0;

  useEffect(() => {
    if (mutation.isPending || !attempt.current) return;
    const current = attempt.current;
    const frame = requestAnimationFrame(() => {
      if (attempt.current !== current) return;
      attempt.current = null;
      if (
        window.location.pathname + window.location.search !== current.path ||
        (document.activeElement !== document.body &&
          document.activeElement !== current.origin)
      )
        return;
      const target =
        isActiveSurfaceElement(current.origin) &&
        !current.origin.matches(":disabled")
          ? current.origin
          : nameInput.current;
      if (isActiveSurfaceElement(target) && !target?.matches(":disabled"))
        target?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [mutation.isPending, completed]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current || !dirty || invalid) return;
    pending.current = true;
    const origin = document.activeElement;
    const path = window.location.pathname + window.location.search;
    const submittedObserved = draft.observed;
    try {
      const saved = await mutation.mutateAsync(changes);
      // A successful PATCH is authoritative even when its invalidation GET fails.
      // A newer confirmed refetch still wins over this earlier response.
      setDraft((current) => {
        const observedTime = Date.parse(current.observed.updatedAt);
        const savedTime = Date.parse(saved.updatedAt ?? "");
        const preferObserved =
          Number.isFinite(observedTime) && Number.isFinite(savedTime)
            ? observedTime >= savedTime
            : current.observed !== submittedObserved;
        const confirmed = preferObserved
          ? current.confirmed
          : {
              name: saved.displayName ?? "",
              isPublic: saved.profilePublic ?? false,
              updatedAt: saved.updatedAt ?? "",
            };
        return {
          ...current,
          confirmed,
          name: confirmed.name,
          isPublic: confirmed.isPublic,
        };
      });
      toast.success(t("Copy.profileSaved"));
    } catch {
      // Keep the draft; callers render the structured, localized API error.
    } finally {
      pending.current = false;
      if (origin instanceof HTMLElement && origin !== document.body) {
        attempt.current = { origin, path };
        setCompleted((value) => value + 1);
      }
    }
  }

  return {
    id,
    nameInput,
    name: draft.name,
    isPublic: draft.isPublic,
    setName: (name: string) => setDraft((value) => ({ ...value, name })),
    setPublic: (isPublic: boolean) =>
      setDraft((value) => ({ ...value, isPublic })),
    invalid,
    dirty,
    busy: mutation.isPending,
    error: mutation.error,
    submit,
  };
}
