"use client";

import type { InputGroupInputProps } from "./InputGroup.types";
import type { FC } from "react";

import Input from "../Input/Input";
import { inputGroupSlots } from "./InputGroup.styles";

const InputGroupInput: FC<InputGroupInputProps> = (props) => {
  const { className, ...rest } = props;
  return <Input {...rest} className={inputGroupSlots().input({ className })} />;
};
export default InputGroupInput;
