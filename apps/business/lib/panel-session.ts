import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function requirePanelSession() {
  const token = (await cookies()).get("gym4me_business")?.value;
  if (!token) redirect("/auth");
  const origin = process.env.PANEL_OTP_API_ORIGIN ?? "http://127.0.0.1:3003";
  const session = await fetch(new URL("/api/v1/business/auth/session", origin), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (session.status === 401 || session.status === 403) redirect("/auth");
  if (!session.ok) throw new Error("Panel authentication is unavailable.");
  return (await session.json()) as { id: string; accountComplete: boolean; hasPassword: boolean };
}
