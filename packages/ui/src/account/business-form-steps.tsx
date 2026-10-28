"use client";
import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "@repo/i18n";
import { useApiContext } from "@repo/api/provider";
import { Button } from "../kit/Button";
/** Steps stay mounted, so the final FormData includes all sections and Back keeps drafts. */
export function BusinessFormSteps({
  labels,
  children,
}: {
  labels: string[];
  children: ReactNode;
}) {
  const panels = Children.toArray(children);
  const [step, setStep] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const t = useTranslations("BusinessFlow");
  useEffect(
    () =>
      setStep((current) => Math.min(current, Math.max(0, panels.length - 1))),
    [panels.length],
  );
  useEffect(() => {
    if (!root.current) return;
    const observer = new MutationObserver(() => {
      const invalid = root.current?.querySelector<HTMLElement>(
        '[data-business-step][hidden] [aria-invalid="true"]',
      );
      const panel = invalid?.closest<HTMLElement>("[data-business-step]");
      if (panel) setStep(Number(panel.dataset.businessStep));
    });
    observer.observe(root.current, {
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-invalid"],
    });
    return () => observer.disconnect();
  }, []);
  function move(next: number) {
    const panel = root.current?.querySelector<HTMLElement>(
      `[data-business-step="${step}"]`,
    );
    if (next > step && panel) {
      const controls = panel.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >("input,select,textarea");
      for (const control of controls)
        if (!control.disabled && !control.checkValidity()) {
          control.reportValidity();
          return;
        }
    }
    setStep(next);
    requestAnimationFrame(() =>
      root.current?.querySelector<HTMLHeadingElement>("h3")?.focus(),
    );
  }
  return (
    <div
      ref={root}
      className="grid w-full min-w-0 gap-6"
      onKeyDown={(e) => {
        if (
          e.key === "Enter" &&
          !e.defaultPrevented &&
          e.target instanceof HTMLInputElement &&
          root.current?.contains(e.target) &&
          e.target.getAttribute("role") !== "combobox" &&
          step < panels.length - 1 &&
          !e.nativeEvent.isComposing
        ) {
          e.preventDefault();
          move(step + 1);
        }
      }}
      onInvalidCapture={(e) => {
        const panel = (e.target as HTMLElement).closest<HTMLElement>(
          "[data-business-step]",
        );
        if (panel?.hidden) {
          e.preventDefault();
          setStep(Number(panel.dataset.businessStep));
          requestAnimationFrame(() =>
            (e.target as HTMLInputElement).reportValidity(),
          );
        }
      }}
    >
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {t("progress", { current: step + 1, total: panels.length })}
        </p>
        <div className="flex gap-2" aria-hidden="true">
          {panels.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
        <h3 tabIndex={-1} className="text-xl font-semibold">
          {labels[step]}
        </h3>
      </div>
      {panels.map((panel, i) => (
        <div key={i} data-business-step={i} hidden={step !== i}>
          {panel}
        </div>
      ))}
      <div className="flex gap-3">
        {step > 0 && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => move(step - 1)}
          >
            {t("previous")}
          </Button>
        )}
        {step < panels.length - 1 && (
          <Button
            type="button"
            className="flex-1"
            onClick={() => move(step + 1)}
          >
            {t("next")}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Long shared business forms use small field groups while short actions stay direct. */
export function BusinessFieldSteps({
  children,
  submit,
}: {
  children: ReactNode;
  submit?: ReactNode;
}) {
  const { api } = useApiContext();
  const fields = Children.toArray(children);
  const t = useTranslations("BusinessFlow");
  if (api.scope[2] !== "business" || fields.length <= 3)
    return (
      <>
        {children}
        {submit}
      </>
    );
  const groups: ReactNode[][] = [];
  for (let index = 0; index < fields.length; index += 3)
    groups.push(fields.slice(index, index + 3));
  return (
    <BusinessFormSteps
      labels={groups.map((_, index) => t("section", { number: index + 1 }))}
    >
      {groups.map((group, index) => (
        <div key={index} className="grid gap-4">
          {group}
          {index === groups.length - 1 && submit}
        </div>
      ))}
    </BusinessFormSteps>
  );
}
