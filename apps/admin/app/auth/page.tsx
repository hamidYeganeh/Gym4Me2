import { pageTitle } from "@/lib/page-title";

import { AuthMethods } from "../../features/auth/index";

export const generateMetadata = pageTitle("ورود", "Sign in");

const Page = () => {
  return <AuthMethods />;
};

export default Page;
