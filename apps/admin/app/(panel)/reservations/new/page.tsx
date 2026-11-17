import { pageTitle } from "@/lib/page-title";

import { SessionWorkspace } from "../../../../features/clubs/sessions/SessionWorkspace";

export const generateMetadata = pageTitle("ثبت رزرو", "Create reservation");

const Page = async (props: { searchParams: Promise<{ club?: string; session?: string }> }) => {
  const { searchParams } = props;
  const { club, session } = await searchParams;
  return <SessionWorkspace mode="reservation" clubId={club} sessionId={session} />;
};
export default Page;
