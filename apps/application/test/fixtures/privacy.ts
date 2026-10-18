import type { DataPolicyDto } from "@repo/api/profile";

/** Illustrative rendering values, never a policy version that can be accepted. */
export const publicPolicyFixture: DataPolicyDto = {
  version: "web-ui-fixture-not-a-real-policy",
  minimumAge: 18,
  backupRetentionDays: 30,
  deletionGraceDays: 14,
  otpRetentionDays: 1,
  sessionRetentionDays: 30,
  invitationRetentionDays: 14,
  auditRetentionDays: 365,
};
