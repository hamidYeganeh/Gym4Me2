import { ClubRequestsPage } from "@/features/clubs/ClubRequestsPage";
import { pageTitle } from "@/lib/page-title";

export const generateMetadata = pageTitle("بررسی انتشار باشگاه‌ها", "Club publication review");

const PublicationPage = () => {
  return <ClubRequestsPage publication />;
};

export default PublicationPage;
