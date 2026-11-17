import { DirectoryContent } from "@/features/club/ClubDirectory";
import { demoClubId } from "@/features/club/clubs";
import DemoClubView from "@/features/club/DemoClubView";

export const metadata = { title: "باشگاه · جیم‌فورمی" };
export const generateStaticParams = () => [{ clubId: demoClubId }];
const ClubPage = async (props: { params: Promise<{ clubId: string }> }) => {
  const { clubId } = await props.params;
  return clubId === demoClubId ? <DemoClubView /> : <DirectoryContent key={clubId} id={clubId} />;
};
export default ClubPage;
