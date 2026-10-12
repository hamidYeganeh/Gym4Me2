"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@repo/ui/kit/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@repo/ui/kit/Card";
import { FieldGroup } from "@repo/ui/kit/Field";
import { Badge } from "@repo/ui/kit/Badge";
import { api, type Account, type Client, type Invitation } from "./api";
import {
  Blank,
  ErrorNotice,
  Loading,
  QueryError,
  Submit,
  TextField,
  dateLabel,
  roleNames,
  useQuery,
} from "./common";
export function ProfileContent({
  client,
  account,
  onSave,
}: {
  client: Client;
  account: Account;
  onSave: (account: Account) => void;
}) {
  const [name, setName] = useState(account.displayName ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await api<Account>(client, "profile/account", "PATCH", {
        displayName: name,
      });
      onSave(user);
      toast.success("پروفایل ذخیره شد.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>اطلاعات حساب</CardTitle>
        <CardDescription>
          این اطلاعات در اپ و پنل‌های شما مشترک است.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-6">
          <FieldGroup>
            <TextField
              label="نام و نام خانوادگی"
              name="displayName"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={100}
            />
            <TextField
              label="شماره موبایل تأییدشده"
              name="phone"
              dir="ltr"
              value={account.phone}
              readOnly
            />
            <ErrorNotice error={error} />
          </FieldGroup>
          <div>
            <Submit busy={busy}>ذخیره تغییرات</Submit>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
type Session = {
  id: string;
  client: string;
  device: string;
  createdAt: string;
  expiresAt: string;
  current: boolean;
};
export function SessionsContent({ client }: { client: Client }) {
  const query = useQuery<Session[]>(client, "auth/sessions");
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function revoke(session: Session) {
    setBusy(session.id);
    setError(null);
    try {
      await api(client, `auth/sessions/${session.id}/revoke`, "POST");
      if (session.current) router.replace("/login");
      else {
        query.reload();
        toast.success("نشست پایان یافت.");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <p className="text-muted-foreground">
        ورودهای فعال به حساب خود را ببین و دسترسی دستگاه‌های دیگر را قطع کن.
      </p>
      <ErrorNotice error={error} />
      <QueryError error={query.error} retry={query.reload} />
      {query.loading ? (
        <Loading />
      ) : (
        <div className="grid gap-4">
          {query.data?.map((session) => (
            <Card key={session.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {{
                        application: "اپلیکیشن",
                        business: "بیزینس",
                        admin: "ادمین",
                      }[session.client] ?? session.client}
                    </p>
                    {session.current && (
                      <Badge variant="secondary">این نشست</Badge>
                    )}
                  </div>
                  <p
                    dir="ltr"
                    className="mt-2 max-w-lg truncate text-start text-xs text-muted-foreground"
                    title={session.device}
                  >
                    {session.device}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    ورود: {dateLabel(session.createdAt)} · انقضا:{" "}
                    {dateLabel(session.expiresAt)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() => void revoke(session)}
                >
                  {session.current ? "خروج از این نشست" : "پایان نشست"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
export function InvitationsContent({ client }: { client: Client }) {
  const query = useQuery<Invitation[]>(client, "profile/invitations");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function accept(id: string) {
    setBusy(id);
    setError(null);
    try {
      await api(client, `profile/invitations/${id}/accept`, "POST");
      query.reload();
      toast.success("دعوت پذیرفته شد. مجموعه در پنل بیزینس در دسترس است.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <ErrorNotice error={error} />
      <QueryError error={query.error} retry={query.reload} />
      {query.loading ? (
        <Loading />
      ) : !query.error && !query.data?.length ? (
        <Blank
          title="دعوت فعالی نداری"
          description="دعوت‌های ارسال‌شده به شماره موبایل شما اینجا نمایش داده می‌شوند."
        />
      ) : (
        query.data?.map((inv) => (
          <Card key={inv.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
              <div>
                <h2 className="font-semibold">{inv.organizationName}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {roleNames[inv.role]} · معتبر تا {dateLabel(inv.expiresAt)}
                </p>
              </div>
              <Button
                disabled={busy !== null}
                onClick={() => void accept(inv.id)}
              >
                پذیرش دعوت
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </>
  );
}
