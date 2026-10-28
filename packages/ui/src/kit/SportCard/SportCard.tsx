"use client";
import Image from "next/image";
import Link from "next/link";
import type { ComponentType, CSSProperties } from "react";
import {
  ArrowUpRightIcon,
  BarbellHorizontalIcon,
  CheckIcon,
} from "../../icons";
import type { SandowIconProps } from "../SandowIcon";
import { cn } from "../../lib/utils";

export type SportCardProps = {
  name: string;
  description?: string;
  image?: string | null;
  href?: string;
  /** A sport glyph becomes the oversized, low-contrast background mark. */
  icon?: ComponentType<SandowIconProps>;
  className?: string;
  color?: string;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
};

export function SportCard({
  name,
  description,
  image,
  href,
  icon: Icon = BarbellHorizontalIcon,
  className,
  color = "var(--primary)",
  onClick,
  selected = false,
  disabled = false,
}: SportCardProps) {
  const content = (
    <>
      {image ? (
        <Image
          src={image}
          alt=""
          fill
          sizes="(max-width: 640px) 171px, 342px"
          className="sport-card-image"
          unoptimized
        />
      ) : (
        <span className="sport-card-watermark" aria-hidden="true">
          <Icon style={{ fontSize: "65cqw", width: "1em", height: "1em" }} />
        </span>
      )}
      {onClick && selected && (
        <span className="sport-card-selection" aria-hidden="true">
          <CheckIcon size={20} />
        </span>
      )}
      {href && !onClick && (
        <ArrowUpRightIcon
          className="sport-card-arrow"
          style={{ fontSize: "10cqw", width: "1em", height: "1em" }}
        />
      )}
      <span className="sport-card-copy">
        <span className="sport-card-name">{name}</span>
        {description && (
          <span className="sport-card-description">{description}</span>
        )}
      </span>
    </>
  );
  const props = {
    className: cn("sport-card", className),
    style: { "--sport-card-color": color } as CSSProperties,
  };
  if (onClick)
    return (
      <button
        {...props}
        type="button"
        aria-pressed={selected}
        disabled={disabled}
        onClick={onClick}
        data-selected={selected || undefined}
      >
        {content}
      </button>
    );
  return href ? (
    <Link {...props} href={href}>
      {content}
    </Link>
  ) : (
    <article {...props}>{content}</article>
  );
}
