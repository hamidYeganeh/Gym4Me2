import { pageTitle } from "@/lib/page-title";

import { AuthForm } from "../../../features/auth/index";

export const generateMetadata = pageTitle("بازیابی رمز عبور", "Recover password");

const Page = () => {
  return <AuthForm mode="forgotPassword" />;
};

export default Page;
