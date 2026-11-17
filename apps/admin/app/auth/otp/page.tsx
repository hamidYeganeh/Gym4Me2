import { pageTitle } from "@/lib/page-title";

import { OtpForm } from "../../../features/auth/index";

export const generateMetadata = pageTitle("ورود با کد یک‌بارمصرف", "One-time code sign-in");

const Page = () => {
  return <OtpForm />;
};

export default Page;
