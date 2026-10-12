export type LocationCardProps = {
  name: string;
  parent: string;
  cover: { src: string; alt: string };
  clubs: { id: string; name: string; image: string }[];
  countLabel: string;
  onSelect: () => void;
};
