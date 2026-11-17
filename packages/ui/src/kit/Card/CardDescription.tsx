import type { CardDescriptionProps } from "./Card.types";
import type { FC } from "react";

import { cardDescriptionVariants } from "./Card.styles";

const CardDescription: FC<CardDescriptionProps> = (props) => {
  const { className, ...rest } = props;

  return (
    <div
      data-slot="card-description"
      className={cardDescriptionVariants({ className })}
      {...rest}
    />
  );
};

export default CardDescription;
