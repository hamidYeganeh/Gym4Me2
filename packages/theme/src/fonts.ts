import localFont from "next/font/local";

export const iranSansX = localFont({
  src: "./fonts/IRANSansXV.woff2",
  variable: "--font-iransansx",
  weight: "100 1000",
  style: "normal",
  display: "swap",
  fallback: ["Tahoma", "Arial", "sans-serif"],
});
