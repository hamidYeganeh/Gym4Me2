import Link from "next/link";
import { BarbellHorizontalIcon } from "./icons";
import { Button } from "./kit/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./kit/Card";
export function TrainingPage({
  title,
  description,
  back,
}: {
  title: string;
  description: string;
  back: string;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-6 pt-[calc(2rem+var(--app-safe-top,env(safe-area-inset-top,0px)))] pb-[calc(2rem+var(--app-safe-bottom,env(safe-area-inset-bottom,0px)))]">
      <div>
        <Button variant="outline" asChild>
          <Link href="/" scroll={false}>
            {back}
          </Link>
        </Button>
      </div>
      <div
        data-zoom-enter-key="training"
        className="flex aspect-square items-center justify-center rounded-3xl bg-primary/15 text-9xl text-primary"
      >
        <BarbellHorizontalIcon />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>{title}</h1>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Gym4Me</p>
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link href="/" scroll={false}>
              {back}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
