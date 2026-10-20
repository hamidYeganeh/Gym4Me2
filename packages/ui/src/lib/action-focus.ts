import { isActiveSurfaceElement } from "./active-surface";

export type ActionFocus = {
  origin: HTMLElement;
  location: string;
  target: () => HTMLElement | null;
};

/** Called after controls commit; a later navigation, modal or user focus wins. */
export function restoreActionFocus(action: ActionFocus, options?: FocusOptions) {
  if (
    window.location.pathname + window.location.search + window.location.hash !==
      action.location ||
    (document.activeElement !== document.body &&
      document.activeElement !== action.origin)
  )
    return false;
  const target = action.target();
  if (
    !isActiveSurfaceElement(target) ||
    target?.matches(':disabled, [aria-disabled="true"]')
  )
    return false;
  target?.focus(options);
  return true;
}
