import type { CardActionProps } from "./Card.types";
import type { FC } from "react";

import { cardActionVariants } from "./Card.styles";

const CardAction: FC<CardActionProps> = (props) => {
  const { className, ...rest } = props;

  return <div data-slot="card-action" className={cardActionVariants({ className })} {...rest} />;
};

export default CardAction;
