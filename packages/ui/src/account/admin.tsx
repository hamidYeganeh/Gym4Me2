"use client";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@repo/ui/kit/Button";
import { Card, CardContent } from "@repo/ui/kit/Card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/kit/Dialog";
import { Field, FieldLabel } from "@repo/ui/kit/Field";
import { Textarea } from "@repo/ui/kit/Textarea";
import { NativeSelect, NativeSelectOption } from "@repo/ui/kit/NativeSelect";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/kit/Table";
import { api } from "./api";
import {
  Blank,
  ErrorNotice,
  Loading,
  QueryError,
  Status,
  Submit,
  TextField,
  dateLabel,
  useQuery,
} from "./common";
type Decision = { id: string; title: string; status: string };
function DecisionDialog({
  decision,
  close,
  save,
  kind,
}: {
  decision: Decision | null;
  close: () => void;
  save: (reason: string) => Promise<void>;
  kind: "user" | "organization";
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await save(reason);
      setReason("");
      close();
      toast.success("تغییرات ثبت شد.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={decision !== null}
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{decision?.title}</DialogTitle>
          <DialogDescription>
            {kind === "user"
              ? "با تعلیق حساب، نشست‌های فعال کاربر پایان می‌یابد. دلیل این تصمیم در رویدادهای مدیریتی ثبت می‌شود."
              : "نتیجه بررسی و دلیل آن برای مالک مجموعه قابل مشاهده است."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-5">
          <Field>
            <FieldLabel htmlFor="decisionReason">دلیل تصمیم</FieldLabel>
            <Textarea
              id="decisionReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={5}
              maxLength={500}
              placeholder="دلیل بررسی را روشن و کوتاه بنویسید."
            />
          </Field>
          <ErrorNotice error={error} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={close}
            >
              انصراف
            </Button>
            <Submit busy={busy}>ثبت تصمیم</Submit>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function Pager({
  page,
  setPage,
  count,
}: {
  page: number;
  setPage: (p: number) => void;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <Button
        variant="outline"
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
      >
        قبلی
      </Button>
      <span className="text-sm text-muted-foreground">
        صفحه {page.toLocaleString("fa-IR")}
      </span>
      <Button
        variant="outline"
        disabled={count < 25}
        onClick={() => setPage(page + 1)}
      >
        بعدی
      </Button>
    </div>
  );
}
type AdminUser = {
  id: string;
  displayName: string | null;
  phone: string;
  status: string;
  createdAt: string;
};
export function AdminUsersContent() {
  const [page, setPage] = useState(1);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const query = useQuery<AdminUser[]>(
    "admin",
    `admin/users?page=${page}&search=${encodeURIComponent(search)}`,
  );
  const [decision, setDecision] = useState<Decision | null>(null);
  async function save(reason: string) {
    if (!decision) return;
    await api("admin", `admin/users/${decision.id}/status`, "PATCH", {
      status: decision.status,
      reason,
    });
    query.reload();
  }
  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(input);
        }}
        className="flex max-w-lg items-end gap-3"
      >
        <TextField
          label="جست‌وجوی کاربر"
          name="userSearch"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="نام یا شماره موبایل"
          maxLength={100}
        />
        <Button type="submit">جست‌وجو</Button>
      </form>
      <QueryError error={query.error} retry={query.reload} />
      {query.loading ? (
        <Loading />
      ) : (
        query.data && (
          <>
            {!query.data.length ? (
              <Blank
                title="کاربری پیدا نشد"
                description="عبارت جست‌وجو را تغییر دهید."
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>کاربر</TableHead>
                        <TableHead>شماره موبایل</TableHead>
                        <TableHead>وضعیت</TableHead>
                        <TableHead>ثبت‌نام</TableHead>
                        <TableHead>عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {query.data.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            {user.displayName ?? "بدون نام"}
                          </TableCell>
                          <TableCell>
                            <bdi>{user.phone}</bdi>
                          </TableCell>
                          <TableCell>
                            <Status value={user.status} />
                          </TableCell>
                          <TableCell>{dateLabel(user.createdAt)}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setDecision({
                                  id: user.id,
                                  title:
                                    user.status === "active"
                                      ? "تعلیق حساب کاربر"
                                      : "فعال‌سازی حساب کاربر",
                                  status:
                                    user.status === "active"
                                      ? "suspended"
                                      : "active",
                                })
                              }
                            >
                              {user.status === "active" ? "تعلیق" : "فعال‌سازی"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
            <Pager page={page} setPage={setPage} count={query.data.length} />
          </>
        )
      )}
      <DecisionDialog
        key={decision?.id ?? "closed"}
        decision={decision}
        close={() => setDecision(null)}
        save={save}
        kind="user"
      />
    </>
  );
}
type AdminOrganization = {
  id: string;
  name: string;
  status: string;
  reviewReason: string | null;
  createdAt: string;
};
export function AdminOrganizationsContent() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("pending");
  const query = useQuery<AdminOrganization[]>(
    "admin",
    `admin/organizations?page=${page}${status ? `&status=${status}` : ""}`,
  );
  const [decision, setDecision] = useState<Decision | null>(null);
  async function save(reason: string) {
    if (!decision) return;
    await api("admin", `admin/organizations/${decision.id}/review`, "POST", {
      status: decision.status,
      reason,
    });
    query.reload();
  }
  return (
    <>
      <Field className="max-w-xs">
        <FieldLabel htmlFor="reviewStatus">وضعیت مجموعه</FieldLabel>
        <NativeSelect
          id="reviewStatus"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <NativeSelectOption value="">همه مجموعه‌ها</NativeSelectOption>
          <NativeSelectOption value="pending">
            در انتظار بررسی
          </NativeSelectOption>
          <NativeSelectOption value="approved">تأییدشده</NativeSelectOption>
          <NativeSelectOption value="rejected">ردشده</NativeSelectOption>
          <NativeSelectOption value="suspended">تعلیق‌شده</NativeSelectOption>
        </NativeSelect>
      </Field>
      <QueryError error={query.error} retry={query.reload} />
      {query.loading ? (
        <Loading />
      ) : (
        query.data && (
          <>
            {!query.data.length ? (
              <Blank
                title="مجموعه‌ای در این وضعیت نیست"
                description="مجموعه‌های جدید پس از ثبت توسط مالک، در صف بررسی قرار می‌گیرند."
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>مجموعه</TableHead>
                        <TableHead>وضعیت</TableHead>
                        <TableHead>تاریخ ثبت</TableHead>
                        <TableHead>بررسی</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {query.data.map((org) => (
                        <TableRow key={org.id}>
                          <TableCell>
                            <p className="font-medium">{org.name}</p>
                            {org.reviewReason && (
                              <p className="mt-1 max-w-xs whitespace-normal text-xs leading-6 text-muted-foreground">
                                {org.reviewReason}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Status value={org.status} />
                          </TableCell>
                          <TableCell>{dateLabel(org.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {[
                                { status: "approved", label: "تأیید" },
                                { status: "rejected", label: "رد" },
                                { status: "suspended", label: "تعلیق" },
                              ]
                                .filter((item) => item.status !== org.status)
                                .map((item) => (
                                  <Button
                                    key={item.status}
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setDecision({
                                        id: org.id,
                                        title: `${item.label} مجموعه ${org.name}`,
                                        status: item.status,
                                      })
                                    }
                                  >
                                    {item.label}
                                  </Button>
                                ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
            <Pager page={page} setPage={setPage} count={query.data.length} />
          </>
        )
      )}
      <DecisionDialog
        key={`${decision?.id}-${decision?.status}`}
        decision={decision}
        close={() => setDecision(null)}
        save={save}
        kind="organization"
      />
    </>
  );
}
type AuditEvent = {
  id: string;
  action: string;
  actorId: string | null;
  targetId: string | null;
  details: Record<string, string>;
  createdAt: string;
};
const eventNames: Record<string, string> = {
  "organization.created": "ثبت مجموعه",
  "branch.created": "افزودن شعبه",
  "team.invited": "دعوت همکار",
  "team.removed": "حذف دسترسی همکار",
  "invitation.revoked": "لغو دعوت",
  "invitation.accepted": "پذیرش دعوت",
  "user.status-changed": "تغییر وضعیت کاربر",
  "organization.reviewed": "بررسی مجموعه",
  "admin.granted-by-operator": "اعطای دسترسی ادمین",
};
export function AdminAuditContent() {
  const [page, setPage] = useState(1);
  const query = useQuery<AuditEvent[]>("admin", `admin/audit?page=${page}`);
  return (
    <>
      <p className="text-muted-foreground">
        سابقه تغییرات دسترسی و تصمیم‌های مدیریتی؛ این رویدادها از پنل قابل
        ویرایش نیستند.
      </p>
      <QueryError error={query.error} retry={query.reload} />
      {query.loading ? (
        <Loading />
      ) : (
        query.data && (
          <>
            {!query.data.length ? (
              <Blank
                title="رویدادی ثبت نشده"
                description="تغییرات مدیریتی پس از انجام در این بخش نمایش داده می‌شوند."
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رویداد</TableHead>
                        <TableHead>عامل</TableHead>
                        <TableHead>توضیح</TableHead>
                        <TableHead>تاریخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {query.data.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            {eventNames[event.action] ?? event.action}
                          </TableCell>
                          <TableCell>
                            <bdi
                              className="text-xs"
                              title={event.actorId ?? undefined}
                            >
                              {event.actorId
                                ? `${event.actorId.slice(0, 8)}…`
                                : "اپراتور سیستم"}
                            </bdi>
                          </TableCell>
                          <TableCell className="max-w-sm whitespace-normal">
                            {event.details.reason ?? "—"}
                          </TableCell>
                          <TableCell>{dateLabel(event.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
            <Pager page={page} setPage={setPage} count={query.data.length} />
          </>
        )
      )}
    </>
  );
}
