"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import type { ReactNode } from "react";

import { useTranslations } from "@repo/i18n";
import { Eye } from "@repo/icons/eye";
import { EyeSlash } from "@repo/icons/eye-slash";
import { Key1 } from "@repo/icons/key-1";
import { Lock1 } from "@repo/icons/lock-1";
import { Mobile } from "@repo/icons/mobile";
import { AnimatedButton } from "@repo/ui/kit/button";
import { Input } from "@repo/ui/kit/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@repo/ui/kit/input-group";
import { Label } from "@repo/ui/kit/label";
import { useRetryAfter } from "@repo/ui/lib/use-retry-after";

import { normalizeIranianMobile } from "../../lib/phone";
import { authClasses } from "./auth-classes";
import { createAuthSchema, minimumPasswordLength } from "./auth-schema";
import { AuthHeading } from "./AuthHeading";

type AuthMode = "login" | "forgotPassword" | "setPassword";

const formIcons = { login: Lock1, forgotPassword: Mobile, setPassword: Key1 };

const Field = (props: { id: string; label: string; error?: string; children: ReactNode }) => {
  const { id, label, error, children } = props;
  return (
    <div className={authClasses.field} data-invalid={error ? true : undefined}>
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      {children}
      {error && (
        <p id={`${id}-error`} className={authClasses.error}>
          {error}
        </p>
      )}
    </div>
  );
};

export const AuthForm = (props: { mode: AuthMode }) => {
  const { mode } = props;
  const t = useTranslations("Auth");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const schema = createAuthSchema(mode, {
    phone: t("validation.phone"),
    code: t("validation.code", { count: 6 }),
    password: t("validation.password"),
    minimumPassword: t("validation.minimumPassword", { count: minimumPasswordLength }),
  });
  const {
    register,
    formState: { dirtyFields, errors },
    handleSubmit,
    setError,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { phone: "", password: "", code: "" },
    mode: "onTouched",
  });

  const includesPhone = mode !== "setPassword";
  const includesPassword = mode === "login" || mode === "setPassword";
  const isEmpty =
    (includesPhone && !dirtyFields.phone) || (includesPassword && !dirtyFields.password);

  const retry = useRetryAfter(mode);

  async function submit(values: { phone: string; password: string; code: string }) {
    if (pending || retry.remaining) return;
    setPending(true);
    const resetPhoneKey = "gym4me.password-reset-phone:" + window.location.host;
    try {
      const endpoint =
        mode === "login" ? "login"
        : mode === "forgotPassword" ? "reset/request"
        : "reset/confirm";
      const payload =
        mode === "setPassword" ?
          {
            phone: sessionStorage.getItem(resetPhoneKey),
            password: values.password,
            code: values.code,
          }
        : {
            phone: normalizeIranianMobile(values.phone),
            ...(mode === "login" ? { password: values.password } : {}),
          };
      const response = await fetch("/api/auth/password/" + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (retry.capture(response)) return;
      if (!response.ok) {
        setError("root", { message: t("unavailable") });
        return;
      }
      if (mode === "forgotPassword") {
        sessionStorage.setItem(resetPhoneKey, normalizeIranianMobile(values.phone) ?? "");
      }
      if (mode === "setPassword") sessionStorage.removeItem(resetPhoneKey);
      const result = await response.json().catch(() => ({}));
      router.replace(
        mode === "forgotPassword" ? "/auth/set-password"
        : mode === "setPassword" ? "/auth/login"
        : result.accountComplete === false ? "/auth/complete"
        : "/",
      );
    } catch {
      setError("root", { message: t("unavailable") });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <AuthHeading
        icon={formIcons[mode]}
        title={t(`${mode}.title`)}
        description={t(`${mode}.description`)}
      />
      <form method="post" noValidate onSubmit={handleSubmit(submit)} className={authClasses.fields}>
        {includesPhone && (
          <Field id="auth-phone" label={t("phone")} error={errors.phone?.message}>
            <Input
              {...register("phone")}
              id="auth-phone"
              size="xl"
              radius="full"
              variant="filled"
              color="neutral"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder={t("phone")}
              className={authClasses.input}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "auth-phone-error" : undefined}
            />
          </Field>
        )}
        {mode === "setPassword" && (
          <Field id="auth-code" label={t("code")} error={errors.code?.message}>
            <Input
              {...register("code")}
              id="auth-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              maxLength={6}
              placeholder={t("code")}
              size="xl"
              radius="full"
              aria-invalid={Boolean(errors.code)}
              aria-describedby={errors.code ? "auth-code-error" : undefined}
            />
          </Field>
        )}
        {includesPassword && (
          <Field id="auth-password" label={t("password")} error={errors.password?.message}>
            <InputGroup className={authClasses.passwordGroup}>
              <InputGroupInput
                {...register("password")}
                id="auth-password"
                size="xl"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "setPassword" ? "new-password" : "current-password"}
                placeholder={t("password")}
                className={authClasses.input}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "auth-password-error" : undefined}
              />
              <InputGroupAddon align="inline-end">
                <AnimatedButton
                  type="button"
                  iconOnly
                  size="sm"
                  color="neutral"
                  variant="text"
                  radius="full"
                  aria-label={t(showPassword ? "hidePassword" : "showPassword")}
                  aria-controls="auth-password"
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ?
                    <Eye aria-hidden />
                  : <EyeSlash aria-hidden />}
                </AnimatedButton>
              </InputGroupAddon>
            </InputGroup>
          </Field>
        )}
        <AnimatedButton
          type="submit"
          size="xl"
          color="neutral"
          radius="full"
          fullWidth
          disabled={isEmpty || pending || retry.remaining > 0}
          loading={pending}
          className={authClasses.submit}
        >
          {t(`${mode}.submit`)}
        </AnimatedButton>
        {retry.remaining > 0 && (
          <p role="status" className={authClasses.error}>
            <span className="sr-only">{t("rateLimitNotice")}</span>
            <span aria-hidden="true">{t("rateLimited", { seconds: retry.remaining })}</span>
          </p>
        )}
        {errors.root?.message && (
          <p role="alert" className={authClasses.error}>
            {errors.root.message}
          </p>
        )}
        {mode === "login" && (
          <AnimatedButton asChild variant="text" color="neutral" radius="full">
            <Link href="/auth/forgot-password">{t("forgotPassword.title")}</Link>
          </AnimatedButton>
        )}
      </form>
    </>
  );
};
