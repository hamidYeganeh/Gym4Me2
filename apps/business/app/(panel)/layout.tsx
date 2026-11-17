import type { ReactNode } from "react";

import { PanelLayout } from "../../features/dashboard/PanelLayout";
import { requirePanelSession } from "../../lib/panel-session";

const Layout = async (props: { children: ReactNode }) => {
  const { children } = props;
  await requirePanelSession();
  return <PanelLayout panel="business">{children}</PanelLayout>;
};

export default Layout;
