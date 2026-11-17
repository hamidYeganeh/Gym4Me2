import createNextIntlPlugin from "next-intl/plugin";

import { createRequire } from "node:module";
import { relative, resolve } from "node:path";

/** Resolve from the consuming app; next-intl's Turbopack integration requires a relative path. */
export function withI18n() {
  const require = createRequire(resolve(process.cwd(), "package.json"));
  const requestPath = relative(process.cwd(), require.resolve("@repo/i18n/request")).replaceAll(
    "\\",
    "/",
  );
  return createNextIntlPlugin(requestPath.startsWith(".") ? requestPath : `./${requestPath}`);
}
