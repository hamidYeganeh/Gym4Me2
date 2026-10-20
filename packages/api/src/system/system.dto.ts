export type HealthDto = {
  status: "ok" | "error";
  service: string;
  checks?: { database: "up" | "down" };
};
export type OpenApiDto = {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, unknown>;
};

export type DataPolicyDto = {
  version: string;
  minimumAge: number;
  backupRetentionDays: number;
  deletionGraceDays: number;
  otpRetentionDays: number;
  sessionRetentionDays: number;
  invitationRetentionDays: number;
  auditRetentionDays: number;
};
