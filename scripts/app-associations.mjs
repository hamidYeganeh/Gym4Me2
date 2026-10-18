import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { associations } from "../apps/application/lib/domain-associations.mjs";
export { associations } from "../apps/application/lib/domain-associations.mjs";
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const output = resolve(process.argv[2] ?? ".artifacts/domain/.well-known");
  const data = associations(
    process.env.ANDROID_RELEASE_SHA256 ?? "",
    process.env.APPLE_APP_ID,
  );
  if (!data.apple && existsSync(resolve(output, "apple-app-site-association")))
    throw new Error(
      "Existing Apple association requires APPLE_APP_ID or explicit operator removal before regeneration.",
    );
  mkdirSync(output, { recursive: true });
  writeFileSync(
    resolve(output, "assetlinks.json"),
    JSON.stringify(data.android, null, 2) + "\n",
  );
  if (data.apple)
    writeFileSync(
      resolve(output, "apple-app-site-association"),
      JSON.stringify(data.apple, null, 2) + "\n",
    );
  console.log(
    "Generated domain association files. Publish on https://gym4me.ir/.well-known/ as application/json without redirects.",
  );
}
