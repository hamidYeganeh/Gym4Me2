import type { VariantProps } from "class-variance-authority";
import type { reviewCardVariants } from "./ReviewCard.styles";

export type ReviewSummary = {
  id: string;
  title: string;
  body: string;
  date: string;
  rating: number;
  verified?: boolean;
  author?: { displayName: string; avatarUrl?: string };
};
export type ReviewVote = "like" | "dislike" | null;
export type ReviewCardVariants = VariantProps<typeof reviewCardVariants>;
export type ReviewCardProps = ReviewCardVariants & {
  review: ReviewSummary;
  labels: {
    verified: string;
    like: string;
    dislike: string;
    report: string;
    more: string;
    rating: string;
  };
  locale?: string;
  vote?: ReviewVote;
  onVoteChange?: (vote: ReviewVote) => void;
  onReport?: () => void;
  onMore?: () => void;
  className?: string;
};
