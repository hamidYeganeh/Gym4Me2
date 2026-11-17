import type { SeparatorProps } from "./Separator.types";
import type { FC } from "react";

import { separatorVariants } from "./Separator.styles";

const Separator: FC<SeparatorProps> = (props) => {
  const { className, orientation = "horizontal", decorative = true, ...rest } = props;

  return (
    <div
      data-slot="separator"
      className={separatorVariants({ orientation, className })}
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : (orientation ?? undefined)}
      {...rest}
    />
  );
};

export default Separator;
