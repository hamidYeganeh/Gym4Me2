"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { PageTransitions } from "@repo/ui/page-transitions";

export function AdminPageTransitions({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <PageTransitions surface="admin" routeId={pathname}>
      {children}
    </PageTransitions>
  );
}
