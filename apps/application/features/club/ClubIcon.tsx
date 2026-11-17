import type { SVGProps } from "react";

const paths = {
  plus: "M12 5v14M5 12h14",
  back: "m15 18-6-6 6-6M9 12h12",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  heart:
    "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  clock: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 6v6l4 2",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z",
  share: "M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7",
  check: "m5 12 4 4L19 6",
  close: "m6 6 12 12M6 18 18 6",
} as const;
const ClubIcon = (allProps: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) => {
  const { name, ...props } = allProps;
  return (
    <svg
      data-directional={name === "back" || name === "arrow" ? "true" : undefined}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
};

export default ClubIcon;
