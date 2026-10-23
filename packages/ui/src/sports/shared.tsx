"use client";
import type { ReactNode } from "react";
import { useTranslations } from "@repo/i18n";
import { Empty, EmptyHeader, EmptyDescription } from "../kit/Empty";
export function Status({ value }: { value: string }) {
  const t = useTranslations("Luma");
  const labels = {
    held: "status.held",
    pending_approval: "status.pending_approval",
    confirmed: "status.confirmed",
    cancelled: "status.cancelled",
    expired: "status.expired",
    completed: "status.completed",
    no_show: "status.no_show",
    active: "status.active",
    frozen: "status.frozen",
    pending: "status.pending",
    paid: "status.paid",
    awaiting_payment: "status.awaiting_payment",
    review: "status.review",
    refunded: "status.refunded",
    partially_refunded: "status.partially_refunded",
    waiting: "status.waiting",
    offered: "status.offered",
    invited: "status.invited",
    accepted: "status.accepted",
    declined: "status.declined",
    open: "status.open",
    assigned: "status.assigned",
    resolved: "status.resolved",
    draft: "status.draft",
    published: "status.published",
    partially_paid: "status.partially_paid",
    approved: "status.approved",
    rejected: "status.rejected",
    verified: "status.verified",
    failed: "status.failed",
    unknown: "status.unknown",
    succeeded: "status.succeeded",
    requested: "status.requested",
    withdrawn: "status.withdrawn",
  } as const;
  return (
    <span className="rounded-full bg-muted px-3 py-1 text-xs">
      {t(labels[value as keyof typeof labels] ?? "status.review")}
    </span>
  );
}
export function Blank({ children }: { children: ReactNode }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyDescription>{children}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
export function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span>{label}</span>
      {children}
    </label>
  );
}
