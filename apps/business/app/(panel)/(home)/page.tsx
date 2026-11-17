import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { HomeView } from "@/features/home/views/HomeView";

const Page = async () => {
  const token = (await cookies()).get("gym4me_business")?.value;
  if (!token) redirect("/auth");
  const origin = process.env.PANEL_OTP_API_ORIGIN ?? "http://127.0.0.1:3003";
  const options = {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  } as const;
  const [clubs, setup] = await Promise.all([
    fetch(new URL("/api/v1/business/clubs", origin), options),
    fetch(new URL("/api/v1/business/clubs/setup", origin), options),
  ]);
  if (clubs.status === 401 || clubs.status === 403) redirect("/auth");
  if (!clubs.ok || !setup.ok) throw new Error("Club setup is unavailable.");
  if (!(await clubs.json()).length && (await setup.json()).length) redirect("/club/new");
  return <HomeView />;
};

export default Page;
