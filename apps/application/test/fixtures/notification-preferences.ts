import type { NotificationPreferencesDto } from "@repo/api/sports";

export const initialNotificationPreferences: NotificationPreferencesDto = {
  reminders: true,
  messages: false,
  invitations: true,
};
export const refreshedNotificationPreferences: NotificationPreferencesDto = {
  reminders: false,
  messages: true,
  invitations: false,
};
