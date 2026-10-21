"use client";
import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";
import "./motion-controls.css";

/** Selection updates immediately; only the decorative measured pill is animated. */
export function SlidingSegments({
  options,
  value,
  onChange,
  label,
  className = "",
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
}) {
  const bar = useRef<HTMLDivElement>(null),
    pill = useRef<HTMLSpanElement>(null),
    painted = useRef(false);
  const labels = options.map((option) => option.label).join("|");
  const move = useCallback((animate: boolean) => {
    const selected = bar.current?.querySelector<HTMLButtonElement>(
      '[aria-pressed="true"]',
    );
    const highlight = pill.current;
    if (!selected || !highlight) return;
    const previous = highlight.style.transition;
    if (!animate) highlight.style.transition = "none";
    highlight.style.transform = `translateX(${selected.offsetLeft}px)`;
    highlight.style.width = `${selected.offsetWidth}px`;
    if (!animate) {
      void highlight.offsetWidth;
      highlight.style.transition = previous;
    }
  }, []);
  useLayoutEffect(() => {
    move(painted.current);
    painted.current = true;
  }, [value, move]);
  useLayoutEffect(() => {
    let alive = true;
    const snap = () => {
      if (alive) move(false);
    };
    const observer = new ResizeObserver(snap);
    if (bar.current) observer.observe(bar.current);
    void document.fonts.ready.then(snap);
    snap();
    return () => {
      alive = false;
      observer.disconnect();
    };
  }, [labels, move]);
  return (
    <div
      ref={bar}
      className={`t-tabs motion-segments ${className}`}
      role="group"
      aria-label={label}
    >
      <span ref={pill} className="t-tabs-pill" aria-hidden="true" />
      {options.map((option) => (
        <button
          type="button"
          className="t-tab"
          key={option.value}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function MotionDisclosure({
  label,
  children,
  className = "",
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false),
    id = useId();
  return (
    <div className={`t-acc motion-disclosure ${className}`} data-open={open}>
      <button
        type="button"
        className="t-acc-head"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        {label}
        <span className="t-acc-chevron" aria-hidden="true">
          <ChevronDown size={16} />
        </span>
      </button>
      <div id={id} className="t-acc-panel" aria-hidden={!open} inert={!open}>
        <div className="t-acc-panel-inner">
          <div className="motion-disclosure-body">{children}</div>
        </div>
      </div>
    </div>
  );
}
