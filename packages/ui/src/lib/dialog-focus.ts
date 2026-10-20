import { isActiveSurfaceElement } from "./active-surface";
import { restoreActionFocus, type ActionFocus } from "./action-focus";

/** Radix gets first choice; only repair focus abandoned on the document body. */
export function restoreDialogFocus(action: ActionFocus | null) {
  if (!action || document.activeElement !== document.body) return false;
  for (const dialog of document.querySelectorAll<HTMLElement>(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
  )) {
    // A still-open parent may own the opener of a closing nested dialog.
    if (!dialog.contains(action.origin) && isActiveSurfaceElement(dialog))
      return false;
  }
  return restoreActionFocus(action, { preventScroll: true });
}
