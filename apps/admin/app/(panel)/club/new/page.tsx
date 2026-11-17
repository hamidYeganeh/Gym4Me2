import { pageTitle } from "@/lib/page-title";

import { ClubRequests } from "../../../../features/clubs/ClubRequests";

export const generateMetadata = pageTitle("درخواست‌های باشگاه", "Club requests");

const Page = () => {
  return <ClubRequests />;
};

export default Page;
