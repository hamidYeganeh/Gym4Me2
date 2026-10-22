"use client";
import { LumaNavigation } from "../luma/common";
/** Catalog pages outside LumaShell use the same primary navigation. */
export function DiscoveryTabBar() {
  return (
    <div className="discovery-tab-bar">
      <LumaNavigation />
    </div>
  );
}
