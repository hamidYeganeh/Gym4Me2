import type { SVGProps } from "react";

export type SocialPlatform = "facebook" | "instagram" | "linkedin";
export type SocialLink = {
  platform: SocialPlatform;
  href: string;
  label?: string;
};

export function SocialIcon({
  platform,
  ...props
}: SVGProps<SVGSVGElement> & { platform: SocialPlatform }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      {platform === "facebook" && (
        <path d="M24 12a12 12 0 1 0-13.875 11.855V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874V12h3.328l-.532 3.469h-2.796v8.386A12.003 12.003 0 0 0 24 12Z" />
      )}
      {platform === "instagram" && (
        <>
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle
            cx="12"
            cy="12"
            r="4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="17.5" cy="6.5" r="1.2" />
        </>
      )}
      {platform === "linkedin" && (
        <path d="M20.45 2H3.55A1.55 1.55 0 0 0 2 3.55v16.9A1.55 1.55 0 0 0 3.55 22h16.9A1.55 1.55 0 0 0 22 20.45V3.55A1.55 1.55 0 0 0 20.45 2ZM8 19H5V9.5h3V19ZM6.5 8.2A1.75 1.75 0 1 1 6.5 4.7a1.75 1.75 0 0 1 0 3.5ZM19 19h-3v-4.62c0-1.1-.02-2.52-1.54-2.52-1.54 0-1.78 1.2-1.78 2.44V19h-3V9.5h2.88v1.3h.04c.4-.76 1.38-1.56 2.84-1.56 3.04 0 3.6 2 3.6 4.6V19Z" />
      )}
    </svg>
  );
}
