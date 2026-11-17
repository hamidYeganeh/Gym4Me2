import { Suspense } from "react";

import { ClubDirectory } from "@/features/club/ClubDirectory";

export const metadata = { title: "باشگاه‌ها · جیم‌فورمی" };

const ClubsPage = () => {
  return (
    <Suspense fallback={<p role="status">در حال بارگذاری باشگاه‌ها…</p>}>
      <ClubDirectory />
    </Suspense>
  );
};

export default ClubsPage;
