import { ClubRequests } from "./ClubRequests";

export const ClubRequestsPage = ({ publication = false }: { publication?: boolean }) => (
  <ClubRequests publication={publication} />
);
