"use client";

import type { AnimatedSelectControlProps } from "./AnimatedSelect.types";

import AnimatedSelect from "./AnimatedSelect";
import AnimatedSelectGroup from "./AnimatedSelectGroup";
import AnimatedSelectItem from "./AnimatedSelectItem";
import AnimatedSelectItemIndicator from "./AnimatedSelectItemIndicator";
import AnimatedSelectItemText from "./AnimatedSelectItemText";
import AnimatedSelectList from "./AnimatedSelectList";
import AnimatedSelectPopup from "./AnimatedSelectPopup";
import AnimatedSelectPortal from "./AnimatedSelectPortal";
import AnimatedSelectPositioner from "./AnimatedSelectPositioner";
import AnimatedSelectTrigger from "./AnimatedSelectTrigger";
import AnimatedSelectValue from "./AnimatedSelectValue";

const AnimatedSelectControl = <Value extends string>(props: AnimatedSelectControlProps<Value>) => {
  const { items, value, onChange, placeholder, required, disabled, name, triggerProps } = props;
  return (
    <AnimatedSelect
      items={items}
      value={value}
      required={required}
      disabled={disabled}
      name={name}
      onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}
    >
      <AnimatedSelectTrigger {...triggerProps}>
        <AnimatedSelectValue placeholder={placeholder} />
      </AnimatedSelectTrigger>
      <AnimatedSelectPortal>
        <AnimatedSelectPositioner sideOffset={6} alignItemWithTrigger={false}>
          <AnimatedSelectPopup>
            <AnimatedSelectList>
              <AnimatedSelectGroup>
                {items.map((item) => (
                  <AnimatedSelectItem key={item.value} value={item.value}>
                    <AnimatedSelectItemText>{item.label}</AnimatedSelectItemText>
                    <AnimatedSelectItemIndicator aria-hidden>✓</AnimatedSelectItemIndicator>
                  </AnimatedSelectItem>
                ))}
              </AnimatedSelectGroup>
            </AnimatedSelectList>
          </AnimatedSelectPopup>
        </AnimatedSelectPositioner>
      </AnimatedSelectPortal>
    </AnimatedSelect>
  );
};

export default AnimatedSelectControl;
