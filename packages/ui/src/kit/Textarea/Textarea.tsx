"use client";

import type { TextareaProps } from "./Textarea.types";
import type { FC } from "react";

import { textareaVariants } from "./Textarea.styles";

const Textarea: FC<TextareaProps> = (props) => {
  const { className, variant, color, size, radius, shadow, resize, ...rest } = props;

  return (
    <textarea
      data-slot="textarea"
      className={textareaVariants({ variant, color, size, radius, shadow, resize, className })}
      {...rest}
    />
  );
};

export default Textarea;
