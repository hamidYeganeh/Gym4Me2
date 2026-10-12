export type ReviewsSummaryProps = {
  counts: Record<1 | 2 | 3 | 4 | 5, number>;
  locale?: string;
  labels: { average: string; users: (count: number) => string; rating: string };
};
