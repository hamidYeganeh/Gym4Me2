import type { CardFooterProps } from "./Card.types";
import type { FC } from "react";

import { cardFooterVariants } from "./Card.styles";

const CardFooter: FC<CardFooterProps> = (props) => {
  const { className, ...rest } = props;

  return <div data-slot="card-footer" className={cardFooterVariants({ className })} {...rest} />;
};

export default CardFooter;
