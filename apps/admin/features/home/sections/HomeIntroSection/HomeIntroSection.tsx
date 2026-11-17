import Image from "next/image";
import Link from "next/link";

export const HomeIntroSection = () => {
  return (
    <section aria-labelledby="home-title" className="flex flex-col gap-3">
      <Image src="/gym4me-logo.png" alt="" width={48} height={48} unoptimized />
      <h1 id="home-title" className="text-theme-display font-semibold text-theme-primary">
        Gym4Me Admin
      </h1>
      <p className="text-theme-body-large text-theme-muted-foreground">
        Manage the Gym4Me platform.
      </p>
      <Link
        href="/club"
        className="mt-4 w-fit rounded-theme-md bg-theme-primary px-4 py-2 font-semibold text-theme-primary-foreground"
      >
        Clubs
      </Link>
    </section>
  );
};
