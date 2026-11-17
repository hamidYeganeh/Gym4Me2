import type { DrawerHandleProps } from "./Drawer.types";
import type { FC } from "react";

import { drawerSlots } from "./Drawer.styles";

const DrawerHandle: FC<DrawerHandleProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <div
      aria-hidden="true"
      data-slot="drawer-handle"
      className={drawerSlots().handle({ className })}
      {...rest}
    />
  );
};

export default DrawerHandle;
