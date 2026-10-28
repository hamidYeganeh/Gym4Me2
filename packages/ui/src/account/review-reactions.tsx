"use client";
import { useSportsCommand, useSportsQuery } from "@repo/api/sports";
import { useTranslations } from "@repo/i18n";
import Link from "next/link";
import { useState } from "react";
import { Button } from "../kit/Button";
import { EmojiReactions, type Reaction } from "../kit/EmojiReactions";
import { applicationAuthHref } from "../lib/auth-routes";
import { ErrorNotice } from "./common";

export function ReviewReactions({
  reviewId,
  kind,
}: {
  reviewId: string;
  kind: "club" | "coach";
}) {
  const t = useTranslations("Bencho");
  const path = `catalog/reviews/${kind}/${reviewId}/reactions`;
  const publicCounts = useSportsQuery<Reaction[]>(path);
  const own = useSportsQuery<Reaction[]>(`${path}/mine`);
  const mutation = useSportsCommand<
    Reaction[],
    { emoji: string; active: boolean }
  >(path);
  const [signIn, setSignIn] = useState(false);
  const guest = own.error?.status === 401 || own.error?.status === 403;
  return (
    <div className="flex flex-col gap-2">
      <EmojiReactions
        reactions={own.data ?? publicCounts.data}
        disabled={mutation.isPending}
        onReact={async (emoji, active) => {
          if (guest) {
            setSignIn(true);
            throw new Error("Sign in required");
          }
          await mutation.mutateAsync({ emoji, active });
        }}
      />
      {signIn && (
        <Button asChild variant="outline">
          <Link
            href={applicationAuthHref(
              "otp",
              typeof window === "undefined"
                ? "/discovery"
                : window.location.pathname + window.location.search,
            )}
          >
            {t("signInToReact")}
          </Link>
        </Button>
      )}
      <ErrorNotice error={mutation.error ?? publicCounts.error} />
    </div>
  );
}
