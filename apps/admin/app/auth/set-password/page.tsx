import { pageTitle } from "@/lib/page-title";

import { AuthForm } from "../../../features/auth/index";

export const generateMetadata = pageTitle("تنظیم رمز عبور", "Set password");

const Page = () => {
  return <AuthForm mode="setPassword" />;
};

export default Page;
