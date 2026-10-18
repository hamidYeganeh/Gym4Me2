import type { NotificationPreferencesDto } from "@repo/api/sports";

export const notificationPreferenceKeys = [
  "reminders",
  "messages",
  "invitations",
] as const;

export type NotificationPreferenceDraft = {
  baseline: NotificationPreferencesDto;
  values: NotificationPreferencesDto;
};

export function preferenceDraft(
  snapshot: NotificationPreferencesDto,
): NotificationPreferenceDraft {
  return { baseline: { ...snapshot }, values: { ...snapshot } };
}

export function preferencesDirty(draft: NotificationPreferenceDraft) {
  return notificationPreferenceKeys.some(
    (key) => draft.values[key] !== draft.baseline[key],
  );
}

/** A read must never replace edits made before or while it was in flight. */
export function refreshPreferenceDraft(
  draft: NotificationPreferenceDraft,
  snapshot: NotificationPreferencesDto,
) {
  return preferencesDirty(draft) ? draft : preferenceDraft(snapshot);
}
