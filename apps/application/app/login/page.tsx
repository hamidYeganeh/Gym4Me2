"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { legacyAuthDestination } from "@repo/ui/lib/auth-routes";
import Loading from "../auth/loading";

export default function Page() {
  const router = useRouter();
  useEffect(
    () => router.replace(legacyAuthDestination(window.location.search)),
    [router],
  );
  return <Loading />;
}
