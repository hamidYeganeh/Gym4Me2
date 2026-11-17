import type { CardTitleProps } from "./Card.types";
import type { FC } from "react";

import { cardTitleVariants } from "./Card.styles";

const CardTitle: FC<CardTitleProps> = (props) => {
  const { className, ...rest } = props;

  return <h3 data-slot="card-title" className={cardTitleVariants({ className })} {...rest} />;
};

export default CardTitle;
