"use client";
import { useState, type ReactNode } from "react";
import Image from "next/image";
import { BottomSheet } from "../BottomSheet";
import { EquipmentCard } from "./EquipmentCard";

export function EquipmentDetails({
  label,
  description,
  icon,
  image,
}: {
  label: string;
  description?: string;
  icon?: ReactNode;
  image?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="relative isolate rounded-3xl text-start outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <EquipmentCard
          label={label}
          description={description}
          icon={icon}
          className={
            image
              ? "relative isolate overflow-hidden bg-transparent text-white"
              : undefined
          }
        />
        {image && (
          <span className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
            <Image
              src={image}
              alt=""
              fill
              sizes="180px"
              className="object-cover"
              unoptimized
            />
            <span className="absolute inset-0 bg-black/60" />
          </span>
        )}
      </button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={label}
        description={description}
      >
        {image && (
          <div className="relative mb-5 aspect-video overflow-hidden rounded-2xl">
            <Image
              src={image}
              alt={label}
              fill
              sizes="576px"
              className="object-cover"
              unoptimized
            />
          </div>
        )}
        {icon && (
          <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/15 text-2xl text-primary">
            {icon}
          </span>
        )}
        <h3 className="text-xl font-semibold">{label}</h3>
        {description && (
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">
            {description}
          </p>
        )}
      </BottomSheet>
    </>
  );
}
