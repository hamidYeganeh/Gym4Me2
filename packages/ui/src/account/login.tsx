"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Dumbbell, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@repo/ui/kit/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@repo/ui/kit/Card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@repo/ui/kit/Field";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@repo/ui/kit/InputOtp";
import { api, ApiError, type Client } from "./api";
import { ErrorNotice, Submit, TextField } from "./common";
const digits = (s: string) =>
  s
    .replace(/[۰-۹]/g, (n) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(n)))
    .replace(/[٠-٩]/g, (n) => String("٠١٢٣٤٥٦٧٨٩".indexOf(n)));
export function LoginPage({ client }: { client: Client }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<string | null>(null);
  const [deadline, setDeadline] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const business = client === "business";
  const admin = client === "admin";
  useEffect(() => {
    const tick = () =>
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  async function requestCode() {
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ challengeId: string; retryAfter: number }>(
        client,
        "auth/otp/request",
        "POST",
        { phone: digits(phone) },
      );
      setChallenge(result.challengeId);
      setCode("");
      setDeadline(Date.now() + result.retryAfter * 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ارسال انجام نشد.");
      if (err instanceof ApiError && err.status === 429)
        setDeadline(Date.now() + 60000);
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!challenge) return requestCode();
    setBusy(true);
    setError(null);
    try {
      await api(client, "auth/otp/verify", "POST", {
        challengeId: challenge,
        code,
      });
      router.replace(client === "application" ? "/profile" : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ورود انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main dir="rtl" className="min-h-dvh bg-background p-5 sm:p-8">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-semibold"
          >
            <Dumbbell className="size-7 text-primary" />
            <span dir="ltr">
              Gym4Me
              <span className="ms-2 text-sm font-normal text-muted-foreground">
                {business ? "Business" : admin ? "Admin" : ""}
              </span>
            </span>
          </Link>
          <span className="text-sm text-muted-foreground">
            {admin ? "مدیریت پلتفرم" : "همراه مسیر ورزشی شما"}
          </span>
        </header>
        <div
          className={`grid flex-1 items-center gap-12 py-12 ${client === "application" ? "" : "lg:grid-cols-2"}`}
        >
          {client !== "application" && (
            <section className="hidden flex-col gap-8 lg:flex">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShieldCheck className="size-7" />
              </div>
              <h1 className="max-w-lg text-5xl font-semibold leading-snug tracking-tight">
                {business ? (
                  <>
                    باشگاهت را
                    <br />
                    یک‌جا مدیریت کن.
                  </>
                ) : (
                  <>
                    دید روشن‌تر،
                    <br />
                    مدیریت دقیق‌تر.
                  </>
                )}
              </h1>
              <p className="max-w-md text-lg leading-9 text-muted-foreground">
                {business
                  ? "از ساخت مجموعه و شعبه تا همکاری با تیم؛ همه از یک پنل، با دسترسی مشخص برای هر نفر."
                  : "کاربران و مجموعه‌ها را بررسی کن و سابقه تصمیم‌های مدیریتی را در دسترس داشته باش."}
              </p>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <span>یک حساب مشترک</span>
                <span>دسترسی مشخص</span>
                <span>ورود امن</span>
              </div>
            </section>
          )}
          <Card className="mx-auto w-full max-w-md py-8 shadow-sm">
            <CardHeader className="gap-3">
              <Smartphone className="mb-3 size-8 text-primary" />
              <CardTitle className="text-2xl">
                {challenge
                  ? "کد تأیید را وارد کن"
                  : admin
                    ? "ورود به پنل ادمین"
                    : business
                      ? "ورود به بیزینس"
                      : "خوش اومدی به جیم‌فورمی"}
              </CardTitle>
              <CardDescription className="leading-7">
                {challenge ? (
                  <>
                    کد ۵ رقمی به <bdi>{phone}</bdi> ارسال شد. کد تا دو دقیقه
                    معتبر است.
                  </>
                ) : (
                  "شماره موبایلت را وارد کن تا کد ورود را برایت بفرستیم."
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <form onSubmit={submit} className="grid gap-6">
                <FieldGroup>
                  {challenge ? (
                    <Field>
                      <FieldLabel htmlFor="otp">کد تأیید</FieldLabel>
                      <div dir="ltr">
                        <InputOTP
                          id="otp"
                          autoFocus
                          maxLength={5}
                          value={code}
                          onChange={(value) => setCode(digits(value))}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          pattern="[0-9۰-۹٠-٩]*"
                          pasteTransformer={digits}
                          containerClassName="justify-center"
                        >
                          <InputOTPGroup>
                            {[0, 1, 2, 3, 4].map((index) => (
                              <InputOTPSlot
                                key={index}
                                index={index}
                                className="size-12 text-xl"
                              />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                    </Field>
                  ) : (
                    <TextField
                      label="شماره موبایل"
                      name="phone"
                      value={phone}
                      onChange={(e) => setPhone(digits(e.target.value))}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="0912 345 6789"
                      dir="ltr"
                      required
                      maxLength={20}
                    />
                  )}
                  <ErrorNotice error={error} />
                </FieldGroup>
                <Submit
                  busy={busy}
                  disabled={
                    (!!challenge && code.length !== 5) ||
                    (!challenge && remaining > 0)
                  }
                >
                  {challenge ? "تأیید و ورود" : "دریافت کد ورود"}
                  <ArrowLeft data-icon="inline-end" />
                </Submit>
              </form>
              {challenge && (
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setChallenge(null);
                      setCode("");
                      setError(null);
                    }}
                  >
                    ویرایش شماره
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy || remaining > 0}
                    onClick={() => void requestCode()}
                  >
                    {remaining > 0
                      ? `ارسال مجدد تا ${remaining.toLocaleString("fa-IR")} ثانیه`
                      : "ارسال مجدد کد"}
                  </Button>
                </div>
              )}
              <FieldDescription className="text-center leading-7">
                {admin
                  ? "ورود تنها برای حساب‌های دارای دسترسی مدیریت پلتفرم امکان‌پذیر است."
                  : "مربی و ورزشکار از یک حساب استفاده می‌کنند. دسترسی تیم باشگاه جداگانه تعیین می‌شود."}
              </FieldDescription>
            </CardContent>
          </Card>
        </div>
        <footer className="py-4 text-center text-xs text-muted-foreground">
          Gym4Me · هر روز، یک قدم بهتر
        </footer>
      </div>
    </main>
  );
}
