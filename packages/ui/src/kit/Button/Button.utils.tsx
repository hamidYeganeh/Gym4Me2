import { Children, cloneElement } from "react";

import type { HTMLAttributes, ReactElement, ReactNode, SyntheticEvent } from "react";

const preventActivation = (event: SyntheticEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

const loadingContent = (children: ReactNode) => (
  <>
    <span className="inline-flex items-center justify-center gap-[inherit] opacity-0">
      {children}
    </span>
    <span aria-hidden="true" className="absolute inline-flex items-center justify-center">
      <svg viewBox="0 0 24 24" fill="none" className="motion-safe:animate-spin">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
        <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" />
      </svg>
    </span>
  </>
);

export const buttonContent = (
  children: ReactNode,
  asChild: boolean,
  disabled: boolean,
  loading: boolean,
) => {
  if (!asChild) return loading ? loadingContent(children) : children;
  const child = Children.only(children) as ReactElement<HTMLAttributes<HTMLElement>>;
  return cloneElement(child, {
    ...(disabled ?
      {
        "aria-disabled": true,
        tabIndex: -1,
        onClickCapture: preventActivation,
        onAuxClickCapture: preventActivation,
        onKeyDownCapture: (event) => {
          if (event.key === "Enter" || event.key === " ") preventActivation(event);
        },
      }
    : {}),
    ...(loading ? { "aria-busy": true, children: loadingContent(child.props.children) } : {}),
  });
};
