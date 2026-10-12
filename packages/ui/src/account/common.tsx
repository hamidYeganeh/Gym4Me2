"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Alert, AlertDescription } from "@repo/ui/kit/Alert";
import { Button } from "@repo/ui/kit/Button";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@repo/ui/kit/Empty";
import { Field, FieldLabel } from "@repo/ui/kit/Field";
import { Input } from "@repo/ui/kit/Input";
import { Spinner } from "@repo/ui/kit/Spinner";
import { Badge } from "@repo/ui/kit/Badge";
import { api, type Client } from "./api";

export const roleNames: Record<string, string> = {
  owner: "مالک",
  manager: "مدیر",
  receptionist: "پذیرش",
  accountant: "حسابدار",
};
export const statusNames: Record<string, string> = {
  pending: "در انتظار بررسی",
  approved: "تأییدشده",
  rejected: "ردشده",
  suspended: "تعلیق‌شده",
  active: "فعال",
};
export const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(
    new Date(value),
  );
export function Status({ value }: { value: string }) {
  return (
    <Badge
      variant={["active", "approved"].includes(value) ? "default" : "secondary"}
    >
      {statusNames[value] ?? value}
    </Badge>
  );
}
export function ErrorNotice({ error }: { error: string | null }) {
  return error ? (
    <Alert variant="destructive" role="alert">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  ) : null;
}
export function Blank({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
export function Loading() {
  return (
    <div
      className="flex items-center justify-center gap-3 py-16 text-muted-foreground"
      role="status"
    >
      <Spinner />
      در حال دریافت اطلاعات…
    </div>
  );
}
export function TextField({
  label,
  name,
  ...props
}: { label: string; name: string } & React.ComponentProps<typeof Input>) {
  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input id={name} name={name} {...props} />
    </Field>
  );
}
export function Submit({
  busy,
  disabled,
  children,
}: {
  busy: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Button type="submit" disabled={busy || disabled}>
      {busy && <Spinner data-icon="inline-start" />}
      {children}
    </Button>
  );
}
export function useQuery<T>(client: Client, path: string | null) {
  const [state, setState] = useState<{
    path: string | null;
    data?: T;
    error: string | null;
    loading: boolean;
  }>({ path, error: null, loading: true });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let cancelled = false;
    if (!path) return;
    api<T>(client, path)
      .then((data) => {
        if (!cancelled) setState({ path, data, error: null, loading: false });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({
            path,
            error: err instanceof Error ? err.message : "خطا در دریافت اطلاعات",
            loading: false,
          });
      });
    return () => {
      cancelled = true;
    };
  }, [client, path, version]);
  return {
    data: state.path === path ? state.data : undefined,
    error: state.path === path ? state.error : null,
    loading: path !== null && (state.path !== path || state.loading),
    reload,
  };
}
export function QueryError({
  error,
  retry,
}: {
  error: string | null;
  retry: () => void;
}) {
  return error ? (
    <div className="grid gap-3">
      <ErrorNotice error={error} />
      <Button variant="outline" onClick={retry}>
        تلاش دوباره
      </Button>
    </div>
  ) : null;
}
