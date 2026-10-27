import type { CSSProperties } from "react";

export function Arrow({ diagonal = false, className = "" }: { diagonal?: boolean; className?: string }) {
  return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h15m-6-6 6 6-6 6"} /></svg>;
}

export function ServiceIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    layout: <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M4 8h16M9 8v13M6 5.5h1m2 0h1" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18M5 7h14M5 17h14" /></>,
    pen: <><path d="m4 3 14 5 3 10-8 3L5 13 4 3Zm0 0 9 10m0 0 5 5" /><circle cx="13" cy="13" r="2" /></>,
    phone: <><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M10 5h4M11 19h2" /></>,
    palette: <><path d="M12 3a9 9 0 0 0 0 18h1a2 2 0 0 0 2-3c-1-2 1-3 3-3a3 3 0 0 0 3-3 9 9 0 0 0-9-9Z" /><circle cx="7" cy="11" r=".7" /><circle cx="10" cy="7" r=".7" /><circle cx="15" cy="7" r=".7" /><circle cx="18" cy="11" r=".7" /></>,
    hexagon: <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />,
    share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m9 10 6-3M9 14l6 3" /></>,
    cube: <><path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10v10M3 7l9 5 9-5M8 4l9 5v5" /></>,
    type: <path d="M5 6V3h14v3M12 3v18m-4 0h8" />,
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.layout}</svg>;
}

export function Sun({ moon = false, style }: { moon?: boolean; style?: CSSProperties }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" style={style}>{moon ? <path d="M20 14a8.5 8.5 0 0 1-10-10 8.5 8.5 0 1 0 10 10Z" /> : <><circle cx="12" cy="12" r="3.5" /><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" /></>}</svg>;
}
