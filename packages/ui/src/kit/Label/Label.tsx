import type { LabelProps } from "./Label.types";
import type { FC } from "react";

import { labelVariants } from "./Label.styles";

const Label: FC<LabelProps> = (props) => {
  const { className, color, size, ...rest } = props;

  return (
    <label data-slot="label" className={labelVariants({ color, size, className })} {...rest} />
  );
};

export default Label;
