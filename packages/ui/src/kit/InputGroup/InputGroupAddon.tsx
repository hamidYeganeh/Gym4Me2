import type { InputGroupAddonProps } from "./InputGroup.types";
import type { FC } from "react";

import { inputGroupSlots } from "./InputGroup.styles";

const InputGroupAddon: FC<InputGroupAddonProps> = (props) => {
  const { className, align = "inline-start", ...rest } = props;
  return (
    <div
      data-slot="input-group-addon"
      data-align={align}
      className={inputGroupSlots().addon({
        className: [
          align === "inline-end" ? "order-last"
          : align === "block-start" ? "order-first w-full py-theme-2"
          : align === "block-end" ? "order-last w-full py-theme-2"
          : "order-first",
          className,
        ],
      })}
      {...rest}
    />
  );
};
export default InputGroupAddon;
