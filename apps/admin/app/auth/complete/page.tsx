import { redirect } from "next/navigation";

import { pageTitle } from "@/lib/page-title";

import { requirePanelSession } from "../../../lib/panel-session";

export const generateMetadata = pageTitle("تکمیل حساب", "Complete account");

const Page = async () => {
  await requirePanelSession();
  redirect("/");
};

export default Page;
