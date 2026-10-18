/** Page-facing observations only; never record phone/password contents. */
export function readAuthErrors() {
  const root = document.querySelector("main[data-gym-auth]");
  const fields = [...root.querySelectorAll("input[data-auth-field]")].map(
    (input) => {
      const ids = (input.getAttribute("aria-describedby") ?? "")
        .split(/\s+/)
        .filter(Boolean);
      const description = ids
        .map((id) => document.getElementById(id))
        .filter(Boolean);
      return {
        field: input.getAttribute("data-auth-field"),
        id: input.id,
        uniqueId:
          [...document.querySelectorAll("[id]")].filter(
            (node) => node.id === input.id,
          ).length === 1,
        invalid: input.getAttribute("aria-invalid") === "true",
        describedBy: ids,
        errors: description.map((node) => {
          const background = node.closest('[data-slot="card"]') ?? root;
          return {
            id: node.id,
            text: node.textContent.trim(),
            role: node.getAttribute("role"),
            inForm: input.closest("form")?.contains(node),
            uniqueId:
              [...document.querySelectorAll("[id]")].filter(
                (other) => other.id === node.id,
              ).length === 1,
            foreground: getComputedStyle(node).color,
            background: getComputedStyle(background).backgroundColor,
          };
        }),
      };
    },
  );
  return {
    noValidate: root.querySelector("form").hasAttribute("novalidate"),
    focusedField: document.activeElement?.getAttribute("data-auth-field"),
    fields,
    errorTexts: [...root.querySelectorAll('[role="alert"]')].map((node) =>
      node.textContent.trim(),
    ),
  };
}
