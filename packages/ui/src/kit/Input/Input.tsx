"use client";

import type { InputProps } from "./Input.types";
import type { FC } from "react";

import { inputVariants } from "./Input.styles";

const Input: FC<InputProps> = (props) => {
  const { className, variant, color, size, htmlSize, radius, shadow, ...rest } = props;

  return (
    <input
      data-slot="input"
      size={htmlSize}
      className={inputVariants({ variant, color, size, radius, shadow, className })}
      {...rest}
    />
  );
};

export default Input;
