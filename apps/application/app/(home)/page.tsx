import Link from "next/link";

import { HomeView } from "@/features/home/views/HomeView";

const Page = () => {
  return (
    <>
      <HomeView />
      <footer className="mx-auto max-w-xl p-6 text-center">
        <Link className="underline" href="/club-registration">
          درخواست ثبت باشگاه
        </Link>
      </footer>
    </>
  );
};

export default Page;
