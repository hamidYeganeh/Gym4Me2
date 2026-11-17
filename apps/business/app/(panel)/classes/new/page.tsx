import { SessionWorkspace } from "../../../../features/clubs/sessions/SessionWorkspace";

const Page = async (props: { searchParams: Promise<{ club?: string; session?: string }> }) => {
  const { searchParams } = props;
  const { club, session } = await searchParams;
  return <SessionWorkspace mode="class" clubId={club} sessionId={session} />;
};
export default Page;
