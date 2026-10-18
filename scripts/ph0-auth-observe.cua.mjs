/** Read rendered controls through cua_repl's read-only DOM scope. */
export function readAuthScreen() {
  const root = document.querySelector("main[data-gym-auth]");
  if (!root) throw new Error("Expected scoped authentication screen");
  const rect = (element) => {
    const r = element.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  };
  const visible = (element) => {
    const r = rect(element);
    return r.width > 0 && r.height > 0;
  };
  const controls = [...root.querySelectorAll("button, a[href]")]
    .filter(visible)
    .map((element) => ({
      name: element.getAttribute("aria-label") || element.textContent.trim(),
      tag: element.tagName,
      type: element.getAttribute("type"),
      disabled: element.hasAttribute("disabled"),
      slot: element.getAttribute("data-slot"),
      ...rect(element),
    }));
  const inputs = [...root.querySelectorAll('input[data-slot="input"]')]
    .filter(visible)
    .map((element) => ({
      id: element.id,
      name: element.name,
      type: element.type,
      required: element.hasAttribute("required"),
      labelled: [...root.querySelectorAll("label")].some(
        (label) => label.htmlFor === element.id && label.textContent.trim(),
      ),
      fontSize: getComputedStyle(element).fontSize,
      ...rect(element),
    }));
  return {
    surface: document.body.dataset.gymFocus,
    path: location.pathname,
    locale: document.documentElement.lang,
    direction: document.documentElement.dir,
    theme: document.documentElement.classList.contains("dark")
      ? "dark"
      : "light",
    viewport: [innerWidth, innerHeight],
    dpr: devicePixelRatio,
    documentWidth: document.documentElement.scrollWidth,
    headings: [...root.querySelectorAll("h1")]
      .filter(visible)
      .map((element) => element.textContent.trim()),
    controls,
    inputs,
    focusedId: document.activeElement?.id,
    alertCount: root.querySelectorAll('[role="alert"]').length,
    invalidInputCount: root.querySelectorAll("input:invalid").length,
    rootMarker: root.getAttribute("data-gym-auth"),
  };
}
