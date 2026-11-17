import { pageTitle } from "@/lib/page-title";

import { AuthForm } from "../../../features/auth/index";

export const generateMetadata = pageTitle("ورود با رمز عبور", "Password sign-in");

const Page = () => {
  return <AuthForm mode="login" />;
};

export default Page;
