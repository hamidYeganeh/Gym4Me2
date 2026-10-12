"use client";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@repo/ui/kit/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@repo/ui/kit/Card";
import { Field, FieldGroup, FieldLabel } from "@repo/ui/kit/Field";
import { NativeSelect, NativeSelectOption } from "@repo/ui/kit/NativeSelect";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/kit/Table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@repo/ui/kit/Dialog";
import { api, type Organization } from "./api";
import {
  Blank,
  ErrorNotice,
  Loading,
  QueryError,
  Status,
  Submit,
  TextField,
  dateLabel,
  roleNames,
  useQuery,
} from "./common";
export function OrganizationsContent() {
  const query = useQuery<Organization[]>("business", "business/organizations");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("business", "business/organizations", "POST", { name });
      setName("");
      query.reload();
      toast.success("مجموعه ثبت شد و در انتظار بررسی است.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>ثبت مجموعه جدید</CardTitle>
          <CardDescription>
            بعد از ثبت، می‌توانی شعبه‌ها را اضافه کنی و تیم خود را دعوت کنی.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-4 sm:max-w-lg">
            <TextField
              label="نام مجموعه"
              name="organizationName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={120}
              placeholder="مثلاً باشگاه ورزشی آریا"
            />
            <ErrorNotice error={error} />
            <div>
              <Submit busy={busy}>
                <Plus data-icon="inline-start" />
                ثبت مجموعه
              </Submit>
            </div>
          </form>
        </CardContent>
      </Card>
      <QueryError error={query.error} retry={query.reload} />
      {query.loading ? (
        <Loading />
      ) : !query.error && !query.data?.length ? (
        <Blank
          title="مجموعه‌ای ثبت نشده"
          description="اولین مجموعه را از فرم بالا ثبت کن."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {query.data?.map((org) => (
            <Card key={org.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{org.name}</CardTitle>
                  <Status value={org.status} />
                </div>
                <CardDescription>
                  نقش شما: {roleNames[org.role]}
                </CardDescription>
              </CardHeader>
              {org.reviewReason && (
                <CardContent>
                  <p className="text-sm leading-7 text-muted-foreground">
                    نتیجه بررسی: {org.reviewReason}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
type Branch = { id: string; name: string; timezone: string; createdAt: string };
export function BranchesContent({
  organization,
}: {
  organization: Organization;
}) {
  const path = `business/organizations/${organization.id}/branches`;
  const query = useQuery<Branch[]>("business", path);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("business", path, "POST", { name });
      setName("");
      query.reload();
      toast.success("شعبه اضافه شد.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {["owner", "manager"].includes(organization.role) && (
        <Card>
          <CardHeader>
            <CardTitle>افزودن شعبه</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="grid max-w-lg gap-4">
              <TextField
                label="نام شعبه"
                name="branchName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={120}
              />
              <ErrorNotice error={error} />
              <div>
                <Submit busy={busy}>افزودن شعبه</Submit>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      <QueryError error={query.error} retry={query.reload} />
      {query.loading ? (
        <Loading />
      ) : !query.error && !query.data?.length ? (
        <Blank
          title="هنوز شعبه‌ای ثبت نشده"
          description="مالک یا مدیر مجموعه می‌تواند شعبه‌ها را اضافه کند."
        />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>شعبه</TableHead>
                  <TableHead>منطقه زمانی</TableHead>
                  <TableHead>تاریخ ثبت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data?.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">{branch.name}</TableCell>
                    <TableCell>
                      <bdi>{branch.timezone}</bdi>
                    </TableCell>
                    <TableCell>{dateLabel(branch.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
type Member = {
  id: string;
  phone: string;
  displayName: string | null;
  role: string;
};
type TeamInvitation = {
  id: string;
  phone: string;
  role: string;
  expiresAt: string;
};
export function TeamContent({ organization }: { organization: Organization }) {
  const path = `business/organizations/${organization.id}`;
  const query = useQuery<{ members: Member[]; invitations: TeamInvitation[] }>(
    "business",
    organization.role === "owner" ? `${path}/team` : null,
  );
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("receptionist");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removal, setRemoval] = useState<{
    id: string;
    invitation: boolean;
  } | null>(null);
  async function invite(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("business", `${path}/invitations`, "POST", { phone, role });
      setPhone("");
      query.reload();
      toast.success("دعوت در حساب این شماره نمایش داده می‌شود.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!removal) return;
    setBusy(true);
    setError(null);
    try {
      await api(
        "business",
        `${path}/${removal.invitation ? "invitations" : "team"}/${removal.id}/${removal.invitation ? "revoke" : "remove"}`,
        "POST",
      );
      setRemoval(null);
      query.reload();
      toast.success("دسترسی لغو شد.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (organization.role !== "owner")
    return (
      <Blank
        title="مدیریت تیم در اختیار مالک است"
        description="برای تغییر دسترسی همکاران، با مالک مجموعه هماهنگ کن."
      />
    );
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>دعوت همکار</CardTitle>
          <CardDescription>
            همکار با این شماره وارد بیزینس می‌شود و دعوت را در بخش دعوت‌های
            همکاری می‌پذیرد. پیامک دعوت ارسال نمی‌شود.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={invite} className="grid max-w-xl gap-5">
            <FieldGroup className="sm:grid sm:grid-cols-2">
              <TextField
                label="شماره موبایل همکار"
                name="invitePhone"
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                maxLength={20}
              />
              <Field>
                <FieldLabel htmlFor="role">نقش در مجموعه</FieldLabel>
                <NativeSelect
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {["manager", "receptionist", "accountant"].map((r) => (
                    <NativeSelectOption key={r} value={r}>
                      {roleNames[r]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </FieldGroup>
            <ErrorNotice error={error} />
            <div>
              <Submit busy={busy}>ثبت دعوت همکاری</Submit>
            </div>
          </form>
        </CardContent>
      </Card>
      <QueryError error={query.error} retry={query.reload} />
      {query.loading ? (
        <Loading />
      ) : (
        query.data && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>اعضای تیم</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>همکار</TableHead>
                      <TableHead>نقش</TableHead>
                      <TableHead>دسترسی</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {query.data.members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <p>{member.displayName ?? "بدون نام"}</p>
                          <bdi className="text-xs text-muted-foreground">
                            {member.phone}
                          </bdi>
                        </TableCell>
                        <TableCell>{roleNames[member.role]}</TableCell>
                        <TableCell>
                          {member.role !== "owner" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setRemoval({ id: member.id, invitation: false })
                              }
                            >
                              لغو دسترسی
                            </Button>
                          ) : (
                            "مالک مجموعه"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>دعوت‌های در انتظار</CardTitle>
              </CardHeader>
              <CardContent>
                {!query.data.invitations.length ? (
                  <Blank
                    title="دعوت بازی وجود ندارد"
                    description="دعوت‌های پذیرفته‌نشده و معتبر اینجا نمایش داده می‌شوند."
                  />
                ) : (
                  <div className="grid gap-4">
                    {query.data.invitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <bdi>{inv.phone}</bdi>
                          <p className="text-sm text-muted-foreground">
                            {roleNames[inv.role]} · تا{" "}
                            {dateLabel(inv.expiresAt)}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setRemoval({ id: inv.id, invitation: true })
                          }
                        >
                          لغو دعوت
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )
      )}
      <Dialog
        open={removal !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setRemoval(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              لغو {removal?.invitation ? "دعوت همکاری" : "دسترسی همکار"}
            </DialogTitle>
            <DialogDescription>
              پس از تأیید، این دسترسی به مجموعه قطع می‌شود. می‌توانی بعداً فرد
              را دوباره دعوت کنی.
            </DialogDescription>
          </DialogHeader>
          <ErrorNotice error={error} />
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setRemoval(null)}
            >
              انصراف
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => void remove()}
            >
              تأیید لغو
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
