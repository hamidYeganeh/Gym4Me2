import assert from "node:assert/strict";
import test from "node:test";
import {
  preferenceDraft,
  preferencesDirty,
  refreshPreferenceDraft,
} from "../lib/notification-preferences";
import {
  initialNotificationPreferences as initial,
  refreshedNotificationPreferences as refreshed,
} from "./fixtures/notification-preferences";

test("a pristine form can explicitly refresh its server snapshot", () => {
  const draft = preferenceDraft(initial);
  assert.equal(preferencesDirty(draft), false);
  const next = refreshPreferenceDraft(draft, refreshed);
  assert.deepEqual(next.values, refreshed);
  assert.equal(preferencesDirty(next), false);
});

test("refresh preserves a draft changed before or during the read", () => {
  const draft = {
    ...preferenceDraft(initial),
    values: { ...initial, reminders: false },
  };
  assert.equal(preferencesDirty(draft), true);
  assert.equal(refreshPreferenceDraft(draft, refreshed), draft);
  assert.equal(draft.values.invitations, true);
  assert.equal(draft.values.messages, false);
});

test("reverting the edits permits a later explicit refresh", () => {
  const draft = preferenceDraft(initial);
  const edited = { ...draft, values: { ...initial, invitations: false } };
  assert.equal(preferencesDirty(edited), true);
  const reverted = { ...edited, values: { ...initial } };
  assert.equal(preferencesDirty(reverted), false);
  assert.deepEqual(
    refreshPreferenceDraft(reverted, refreshed).values,
    refreshed,
  );
});

test("a confirmed save becomes the new baseline for subsequent edits", () => {
  const confirmed = preferenceDraft(refreshed);
  assert.equal(preferencesDirty(confirmed), false);
  assert.equal(
    preferencesDirty({
      ...confirmed,
      values: { ...refreshed, messages: false },
    }),
    true,
  );
});
