export const directoryClasses = {
  avatar: "w-[44px] h-[44px] rounded-[50%] grid place-items-center bg-theme-secondary",
  empty:
    "[&_p]:text-theme-muted-foreground [padding:48px_24px] [border:1px_solid_var(--theme-color-border)] " +
    "rounded-[16px] [&_h2]:text-[length:var(--theme-text-h5)] [&_h2]:mb-[8px]",
  header:
    "flex items-center justify-between gap-[16px] flex-wrap [&_h1]:text-[length:var(--theme-text-h3)] " +
    "[&_h1]:font-bold [&_p]:text-theme-muted-foreground",
  list: "grid gap-[12px]",
  page: "max-w-[1080px] mx-auto [padding:48px_24px] grid gap-[24px]",
  row:
    "[&_small]:text-theme-muted-foreground [&_small]:block [&_small]:[overflow-wrap:anywhere] grid " +
    "grid-cols-[auto_1fr_auto] items-center gap-[16px] [border:1px_solid_var(--theme-color-border)] " +
    "rounded-[16px] p-[16px] hover:bg-theme-secondary [&_strong]:block [&_strong]:[overflow-wrap:anywhere]",
};
