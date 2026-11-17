import type { CardContentProps } from "./Card.types";
import type { FC } from "react";

import { cardContentVariants } from "./Card.styles";

const CardContent: FC<CardContentProps> = (props) => {
  const { className, ...rest } = props;

  return <div data-slot="card-content" className={cardContentVariants({ className })} {...rest} />;
};

export default CardContent;
