import { LoginPage } from "@repo/ui/account";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ method?: string | string[] }>;
}) {
  const { method } = await searchParams;
  return (
    <LoginPage
      client="business"
      initialMethod={method === "password" ? "password" : "otp"}
    />
  );
}
