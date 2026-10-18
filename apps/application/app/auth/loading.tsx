import { Skeleton } from "@repo/ui/kit/Skeleton";

export default function Loading() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex min-h-dvh max-w-xl flex-col gap-8 px-5 py-24"
    >
      <Skeleton className="mx-auto size-16 rounded-full" />
      <Skeleton className="mx-auto h-8 w-3/4" />
      <Skeleton className="h-14 w-full rounded-full" />
    </main>
  );
}
