import type { FieldLegendProps } from "./Field.types";
import type { FC } from "react";

import { fieldSlots } from "./Field.styles";

const FieldLegend: FC<FieldLegendProps> = (props) => {
  const { className, ...rest } = props;
  return <legend data-slot="legend" className={fieldSlots().legend({ className })} {...rest} />;
};
export default FieldLegend;
