import Link from "next/link";

const applications = [
  {
    href: "/club-registration/",
    title: "مالک باشگاه هستی؟",
    description: "باشگاهت را در جیم‌فورمی معرفی کن.",
    action: "ثبت باشگاه",
  },
  {
    href: "/coach-registration/",
    title: "مربی ورزشی هستی؟",
    description: "برای همکاری به‌عنوان مربی درخواست بده.",
    action: "ثبت درخواست مربی",
  },
];

export const PartnershipCtaSection = () => {
  return (
    <nav
      dir="rtl"
      lang="fa"
      aria-label="ثبت درخواست همکاری"
      className="mt-8 grid gap-3 sm:grid-cols-2"
    >
      {applications.map(({ href, title, description, action }) => (
        <Link
          key={href}
          href={href}
          aria-label={`${title} ${action}`}
          className="group flex min-h-32 items-center justify-between gap-3 rounded-3xl bg-[#d3e9ed] p-4 text-[#161d1f] transition-colors hover:bg-[#e2f3f5] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff941f] sm:p-5"
        >
          <div className="min-w-0">
            <h2 className="text-lg leading-snug font-extrabold sm:text-xl">{title}</h2>
            <p className="mt-1 text-sm text-[#33494f]">{description}</p>
            <span className="mt-3 inline-block rounded-full bg-[#ff941f] px-3 py-1 text-sm font-bold group-hover:bg-[#ffab4e]">
              {action}
            </span>
          </div>
          <span
            aria-hidden="true"
            className="grid size-16 shrink-0 place-items-center rounded-full border border-dashed border-[#78969e] sm:size-20"
          >
            <span className="grid size-6 place-items-center rounded-full bg-[#161d1f] text-sm leading-none text-[#d3e9ed] transition-transform group-hover:-translate-x-1 motion-reduce:transition-none">
              ←
            </span>
          </span>
        </Link>
      ))}
    </nav>
  );
};
