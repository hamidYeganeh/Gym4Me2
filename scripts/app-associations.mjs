import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
export function associations(fingerprints, appleAppId) {
  const fingerprintsList = fingerprints
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  if (
    !fingerprintsList.length ||
    fingerprintsList.some((s) => !/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s))
  )
    throw new Error(
      "Provide release signing SHA-256 fingerprints, comma separated.",
    );
  if (appleAppId && !/^[A-Z0-9]{10}\.com\.gym4me\.app$/.test(appleAppId))
    throw new Error(
      "Use the Apple application identifier prefix plus com.gym4me.app.",
    );
  return {
    android: [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.gym4me.app",
          sha256_cert_fingerprints: [...new Set(fingerprintsList)],
        },
      },
    ],
    apple: appleAppId
      ? {
          applinks: {
            details: [
              {
                appIDs: [appleAppId],
                components: [{ "/": "/discovery/clubs/*" }],
              },
            ],
          },
        }
      : undefined,
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const output = resolve(process.argv[2] ?? ".artifacts/domain/.well-known");
  const data = associations(
    process.env.ANDROID_RELEASE_SHA256 ?? "",
    process.env.APPLE_APP_ID,
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
