import type { ComponentPropsWithRef, ComponentType } from "react";

export type IconProps = ComponentPropsWithRef<"svg"> & {
  size?: number | string;
};

export type IconComponent = ComponentType<IconProps>;
