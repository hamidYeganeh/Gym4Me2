"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { BottomSheet } from "../kit/BottomSheet";
import { Button } from "../kit/Button";

/** A focused create action, shared by club, branch, team and resource editors. */
export function ActionEditor({
  title,
  description,
  busy = false,
  completed = false,
  children,
}: {
  title: string;
  description?: string;
  busy?: boolean;
  completed?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (completed) setOpen(false);
  }, [completed]);
  return (
    <>
      <Button
        type="button"
        className="action-editor-trigger"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Plus size={18} aria-hidden="true" />
        {title}
      </Button>
      <BottomSheet
        title={title}
        description={description}
        open={open}
        onOpenChange={(next) => {
          if (!busy) setOpen(next);
        }}
      >
        <div className="action-editor-body">{children}</div>
      </BottomSheet>
    </>
  );
}
