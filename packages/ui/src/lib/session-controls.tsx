"use client";

import { useId } from "react";

import type { ReactNode } from "react";

import {
  AnimatedAccordion,
  AnimatedAccordionContent,
  AnimatedAccordionItem,
  AnimatedAccordionTrigger,
} from "../kit/Accordion";
import { Field, FieldDescription, FieldLabel } from "../kit/Field";
import { AnimatedSelectControl } from "../kit/Select";
import { AnimatedSwitch, AnimatedSwitchThumb } from "../kit/Switch";

export const Choice = (props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: { value: string; label: string }[];
}) => {
  const { label, ...select } = props;
  const id = useId();
  return (
    <Field>
      <FieldLabel id={id}>{label}</FieldLabel>
      <AnimatedSelectControl
        {...select}
        placeholder="Choose an option"
        triggerProps={{ "aria-labelledby": id }}
      />
    </Field>
  );
};

export const Option = (props: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) => {
  const { label, hint, checked, onChange } = props;
  const id = useId();
  return (
    <Field className="flex flex-row items-center justify-between gap-4">
      <div className="grid gap-1">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <FieldDescription id={id + "-hint"}>{hint}</FieldDescription>
      </div>
      <AnimatedSwitch
        id={id}
        aria-describedby={id + "-hint"}
        checked={checked}
        onCheckedChange={onChange}
      >
        <AnimatedSwitchThumb />
      </AnimatedSwitch>
    </Field>
  );
};

export const Disclosure = (props: { title: string; summary: string; children: ReactNode }) => {
  const { title, summary, children } = props;
  return (
    <AnimatedAccordion>
      <AnimatedAccordionItem value="details">
        <AnimatedAccordionTrigger>
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-start">
            <span>{title}</span>
            <span className="text-xs text-theme-muted-foreground">{summary}</span>
          </span>
        </AnimatedAccordionTrigger>
        <AnimatedAccordionContent>{children}</AnimatedAccordionContent>
      </AnimatedAccordionItem>
    </AnimatedAccordion>
  );
};
