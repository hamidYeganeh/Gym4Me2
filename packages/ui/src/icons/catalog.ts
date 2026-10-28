import * as icons from "./index";
import { BarbellHorizontalIcon } from "./index";

/** Only named, bundled font icons can be resolved from catalog data. */
export const sandowIconNames = Object.keys(
  icons,
).sort() as (keyof typeof icons)[];
export function catalogIcon(name?: string | null) {
  return name && Object.prototype.hasOwnProperty.call(icons, name)
    ? icons[name as keyof typeof icons]
    : BarbellHorizontalIcon;
}
