import { pageTitle } from "@/lib/page-title";

import { SessionWorkspace } from "../../../features/clubs/sessions/SessionWorkspace";

export const generateMetadata = pageTitle("کلاس‌ها و رزروها", "Classes & reservations");

const Page = async (props: { searchParams: Promise<{ club?: string; session?: string }> }) => {
  const { searchParams } = props;
  const { club, session } = await searchParams;
  return <SessionWorkspace mode="list" clubId={club} sessionId={session} />;
};
export default Page;
