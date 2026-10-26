import type { Metadata, Viewport } from "next";
import { SiteChrome } from "@/components/site-chrome";
import { profile } from "@/lib/content";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${profile.name} — ${profile.role}`, template: `%s — ${profile.name}` },
  description: profile.description,
  openGraph: { title: `${profile.name} — ${profile.role}`, description: profile.description, images: [{ url: "/images/mahdi-original.png", width: 640, height: 640 }] },
};
export const viewport: Viewport = { themeColor: "#2448ff", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: `try{document.documentElement.dataset.theme=localStorage.getItem('mahdi-portfolio-theme')==='dark'?'dark':'light'}catch(e){}` }} /></head><body id="top"><SiteChrome>{children}</SiteChrome></body></html>;
}
