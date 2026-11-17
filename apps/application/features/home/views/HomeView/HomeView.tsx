import { HomeIntroSection } from "../../sections/HomeIntroSection";
import { PartnershipCtaSection } from "../../sections/PartnershipCtaSection/PartnershipCtaSection";

export const HomeView = () => {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-center px-6 py-12">
      <HomeIntroSection />
      <PartnershipCtaSection />
    </main>
  );
};
