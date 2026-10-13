"use client";
import { useTranslations } from "@repo/i18n";
import { cn } from "@repo/ui/lib/utils";
import { Loader2Icon } from "lucide-react";
import { spinnerStyles } from "./Spinner.styles";
import type { SpinnerProps } from "./Spinner.types";

function Spinner({ className, ...props }: SpinnerProps) {
  const t = useTranslations();
  return (
    <Loader2Icon
      data-slot="spinner"
      role="status"
      aria-label={t("Kit.loading")}
      className={cn(spinnerStyles.spinner(), className)}
      {...props}
    />
  );
}

export { Spinner };
