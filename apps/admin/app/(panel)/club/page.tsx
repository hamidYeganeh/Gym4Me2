import { ClubRequestsPage } from "@/features/clubs/ClubRequestsPage";
import { pageTitle } from "@/lib/page-title";

export const generateMetadata = pageTitle("درخواست‌های باشگاه", "Club requests");

const Page = () => {
  return <ClubRequestsPage />;
};

export default Page;
