"use client";

import type { InputGroupButtonProps } from "./InputGroup.types";
import type { FC } from "react";

import Button from "../Button/Button";

const InputGroupButton: FC<InputGroupButtonProps> = (props) => {
  const { className, ...rest } = props;
  return <Button {...rest} className={className} />;
};
export default InputGroupButton;
