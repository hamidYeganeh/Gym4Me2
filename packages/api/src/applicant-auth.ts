import { createHttp } from "./http";

export function createApplicantAuth(origin: string) {
  const http = createHttp(new URL("/api/v1/applicant/auth/", origin).href);

  return {
    requestCode: (data: { phone: string }) =>
      http<{ sent: true }>({ url: "otp", method: "POST", data }),
    confirmCode: (data: { phone: string; code: string }) =>
      http<{ token: string }>({ url: "otp/confirm", method: "POST", data }),
    login: (data: { phone: string; password: string }) =>
      http<{ token: string }>({ url: "login", method: "POST", data }),
    requestPasswordReset: (data: { phone: string }) =>
      http<{ sent: true }>({ url: "password/reset/request", method: "POST", data }),
    resetPassword: (data: { phone: string; code: string; password: string }) =>
      http<{ updated: true }>({ url: "password/reset/confirm", method: "POST", data }),
    session: (token: string, signal?: AbortSignal) =>
      http<{ id: string }>({
        url: "session",
        headers: { Authorization: `Bearer ${token}` },
        signal,
      }),
    logout: (token: string) =>
      http<void>({
        url: "logout",
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }),
  };
}
