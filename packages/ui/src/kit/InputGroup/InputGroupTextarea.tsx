"use client";

import type { InputGroupTextareaProps } from "./InputGroup.types";
import type { FC } from "react";

import Textarea from "../Textarea/Textarea";
import { inputGroupSlots } from "./InputGroup.styles";

const InputGroupTextarea: FC<InputGroupTextareaProps> = (props) => {
  const { className, ...rest } = props;
  return <Textarea {...rest} className={inputGroupSlots().textarea({ className })} />;
};
export default InputGroupTextarea;
