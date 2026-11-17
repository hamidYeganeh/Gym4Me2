"use client";

import type { FitnessClub } from "./clubs";

import { useMessages } from "@repo/i18n";

import ClubReviewsView from "./ClubReviewsView";
import ClubView from "./ClubView";

const DemoClubView = (props: { reviews?: boolean }) => {
  const { reviews = false } = props;
  const messages = useMessages();
  const club = messages.Club.demo as FitnessClub;
  return reviews ? <ClubReviewsView club={club} /> : <ClubView club={club} />;
};
export default DemoClubView;
