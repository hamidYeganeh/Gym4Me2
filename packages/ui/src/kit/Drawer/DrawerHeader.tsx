import type { DrawerHeaderProps } from "./Drawer.types";
import type { FC } from "react";

import { drawerSlots } from "./Drawer.styles";

const DrawerHeader: FC<DrawerHeaderProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <div data-slot="drawer-header" className={drawerSlots().header({ className })} {...rest} />
  );
};
export default DrawerHeader;
