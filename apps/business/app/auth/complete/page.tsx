import { redirect } from "next/navigation";

import { Onboarding } from "../../../features/auth/index";
import { requirePanelSession } from "../../../lib/panel-session";

const Page = async () => {
  const session = await requirePanelSession();
  if (session.accountComplete) redirect("/");
  return <Onboarding completion hasPassword={session.hasPassword} />;
};

export default Page;
