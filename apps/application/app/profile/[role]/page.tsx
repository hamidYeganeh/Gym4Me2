import { notFound } from "next/navigation";

import ProfileView from "@/features/profile/ProfileView";

const roles = ["athlete", "coach"] as const;
export function generateStaticParams() {
  return roles.map((role) => ({ role }));
}
const Page = async (props: PageProps<"/profile/[role]">) => {
  const { params } = props;
  const { role } = await params;
  const match = roles.find((value) => value === role);
  if (!match) notFound();
  return <ProfileView key={match} role={match} />;
};

export default Page;
