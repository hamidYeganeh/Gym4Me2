export type ClubBranch = {
  id: string;
  name: string;
  address: string;
  photo: { src: string; alt: string };
};
export type ClubBranchCardProps = { branch: ClubBranch; viewLabel: string };
