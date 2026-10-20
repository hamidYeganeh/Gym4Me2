import { isActiveSurfaceElement } from "@repo/ui/lib/active-surface";

export type SavedRemovalFocus = {
  button: HTMLButtonElement;
  ids: string[];
  path: string;
};

/** Returns false only while the original row or its replacement is still loading. */
export function restoreSavedRemovalFocus(
  surface: HTMLElement | null,
  attempt: SavedRemovalFocus,
) {
  if (
    !surface ||
    !isActiveSurfaceElement(surface) ||
    `${window.location.pathname}${window.location.search}` !== attempt.path ||
    (document.activeElement !== document.body &&
      document.activeElement !== attempt.button)
  )
    return true;
  if (attempt.button.isConnected || surface.querySelector('[aria-busy="true"]'))
    return false;
  const buttons = [
    ...surface.querySelectorAll<HTMLButtonElement>("button[data-saved-id]"),
  ];
  // A failed removal can replace the list but retain the original item.
  const ids = [attempt.button.dataset.savedId, ...attempt.ids];
  const target =
    ids
      .map((id) => buttons.find((button) => button.dataset.savedId === id))
      .find((button) => isActiveSurfaceElement(button ?? null)) ??
    surface.querySelector<HTMLElement>("[data-saved-empty]") ??
    surface.querySelector<HTMLElement>("[data-saved-fallback]");
  if (isActiveSurfaceElement(target)) target?.focus();
  return true;
}
