"use client";

import { useState, useTransition } from "react";
import { useReadiness } from "@repo/api/system";
import { AnimatedThemeToggler } from "./kit/AnimatedThemeToggler";
import { BarbellHorizontalIcon, GlobeIcon } from "./icons";
import { Button } from "./kit/Button";
import { Badge } from "./kit/Badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./kit/Card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "./kit/Dialog";
import { Separator } from "./kit/Separator";
import { Spinner } from "./kit/Spinner";

type HomeLabels = Record<
  | "brand"
  | "title"
  | "description"
  | "ready"
  | "theme"
  | "language"
  | "api"
  | "available"
  | "unavailable"
  | "check"
  | "sample"
  | "dialog"
  | "dialogDescription"
  | "close",
  string
>;

export function WorkspaceHome({
  labels,
  changeLocale,
}: {
  labels: HomeLabels;
  changeLocale: () => Promise<void>;
}) {
  const [changingLocale, startTransition] = useTransition();
  const health = useReadiness(false);
  const checking = health.isFetching;
  const [status, setStatus] = useState<boolean | null>(null);

  async function checkApi() {
    const result = await health.refetch();
    setStatus(result.data?.status === "ok" && !result.error);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center gap-8 px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(3rem,env(safe-area-inset-bottom))]">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <span className="text-xl font-semibold">{labels.brand}</span>
        <div className="flex items-center gap-2">
          <AnimatedThemeToggler label={labels.theme} />
          <Button
            variant="outline"
            disabled={changingLocale}
            onClick={() => startTransition(changeLocale)}
          >
            {changingLocale ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <GlobeIcon data-icon="inline-start" />
            )}
            {labels.language}
          </Button>
        </div>
      </header>
      <Card>
        <CardHeader>
          <Badge variant="secondary">{labels.ready}</Badge>
          <CardTitle>{labels.title}</CardTitle>
          <CardDescription>{labels.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <BarbellHorizontalIcon data-icon="inline-start" />
                {labels.sample}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{labels.dialog}</DialogTitle>
                <DialogDescription>
                  {labels.dialogDescription}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{labels.close}</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-4">
          <Separator />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p role="status" className="text-sm text-muted-foreground">
              {status === null
                ? labels.api
                : status
                  ? labels.available
                  : labels.unavailable}
            </p>
            <Button variant="ghost" disabled={checking} onClick={checkApi}>
              {checking && <Spinner data-icon="inline-start" />}
              {labels.check}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </main>
  );
}
