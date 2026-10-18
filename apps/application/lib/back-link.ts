export function handlesBackLink(
  event: {
    defaultPrevented: boolean;
    button: number;
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
  },
  link: {
    href: string | null;
    label: string | null;
    inHeader: boolean;
    target: string | null;
    download: boolean;
  },
  labels: ReadonlySet<string>,
) {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    link.inHeader &&
    !link.download &&
    (!link.target || link.target === "_self") &&
    !!link.label &&
    labels.has(link.label) &&
    !!link.href &&
    link.href.startsWith("/") &&
    !link.href.startsWith("//") &&
    !link.href.includes("\\")
  );
}
