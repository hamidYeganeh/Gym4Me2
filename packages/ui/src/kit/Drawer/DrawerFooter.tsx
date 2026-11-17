import type { DrawerFooterProps } from "./Drawer.types";
import type { FC } from "react";

import { drawerSlots } from "./Drawer.styles";

const DrawerFooter: FC<DrawerFooterProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <div data-slot="drawer-footer" className={drawerSlots().footer({ className })} {...rest} />
  );
};
export default DrawerFooter;
