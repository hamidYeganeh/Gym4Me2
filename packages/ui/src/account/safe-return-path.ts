export function safeReturnPath(
  value: string | null | undefined,
  fallback: string,
) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !Array.from(value).some(
      (character) => character === "\\" || character.charCodeAt(0) < 32,
    )
    ? value
    : fallback;
}
