import type { CardHeaderProps } from "./Card.types";
import type { FC } from "react";

import { cardHeaderVariants } from "./Card.styles";

const CardHeader: FC<CardHeaderProps> = (props) => {
  const { className, ...rest } = props;

  return <div data-slot="card-header" className={cardHeaderVariants({ className })} {...rest} />;
};

export default CardHeader;
