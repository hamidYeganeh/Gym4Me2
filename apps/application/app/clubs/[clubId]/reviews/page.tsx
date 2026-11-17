import { notFound } from "next/navigation";

import { demoClubId } from "@/features/club/clubs";
import DemoClubView from "@/features/club/DemoClubView";

export const metadata = { title: "نظرات اعضا · جیم‌فورمی" };
export const dynamicParams = false;
export const generateStaticParams = () => [{ clubId: demoClubId }];
const ReviewsPage = async (props: { params: Promise<{ clubId: string }> }) => {
  const { clubId } = await props.params;
  if (clubId !== demoClubId) notFound();
  return <DemoClubView reviews />;
};
export default ReviewsPage;
