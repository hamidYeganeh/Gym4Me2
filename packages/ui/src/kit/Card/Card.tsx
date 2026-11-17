import type { CardProps } from "./Card.types";
import type { FC } from "react";

import { cardVariants } from "./Card.styles";

const Card: FC<CardProps> = (props) => {
  const { className, variant, radius, shadow, size, ...rest } = props;
  const { root } = cardVariants({ variant, radius, shadow, size });

  return <div data-slot="card" className={root({ className })} {...rest} />;
};

export default Card;
