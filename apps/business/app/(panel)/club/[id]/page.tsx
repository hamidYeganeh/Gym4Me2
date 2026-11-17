import { ClubWorkspace } from "../../../../features/clubs/ClubWorkspace";

const Page = async (props: { params: Promise<{ id: string }> }) => {
  const { id } = await props.params;
  return <ClubWorkspace id={id} />;
};

export default Page;
