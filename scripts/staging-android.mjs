import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  cpSync,
  existsSync,
  rmSync,
} from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { X509Certificate } from "node:crypto";
const root = fileURLToPath(new URL("..", import.meta.url));
const app = resolve(root, "apps/application");
const destination = resolve(root, ".staging-android");
const certificate = readFileSync(resolve(root, ".staging-tls/ca.crt"));
const ca = new X509Certificate(certificate);
if (!ca.ca || Date.parse(ca.validTo) <= Date.now())
  throw new Error("A current local staging CA is required.");
const result = spawnSync(process.execPath, ["scripts/build-native.mjs"], {
  cwd: app,
  stdio: "inherit",
  env: {
    ...process.env,
    GYM_STAGING_WEB: "false",
    NEXT_PUBLIC_API_URL: "https://localhost:7443/api/v1",
    NEXT_PUBLIC_SITE_URL: "https://gym4me.ir",
  },
});
if (result.status !== 0) throw new Error("Native staging export failed.");
// Only replace generated staging material; main/release Android assets stay intact.
if (existsSync(destination)) rmSync(destination, { recursive: true });
mkdirSync(resolve(destination, "res/raw"), { recursive: true });
mkdirSync(resolve(destination, "res/xml"), { recursive: true });
mkdirSync(resolve(destination, "assets"), { recursive: true });
writeFileSync(resolve(destination, "res/raw/gym_staging_ca.crt"), certificate);
writeFileSync(
  resolve(destination, "res/xml/gym_staging_network.xml"),
  `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false"><trust-anchors><certificates src="system" /></trust-anchors></base-config>
  <domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="false">localhost</domain>
    <trust-anchors><certificates src="@raw/gym_staging_ca" /></trust-anchors>
  </domain-config>
</network-security-config>
`,
);
writeFileSync(
  resolve(destination, "AndroidManifest.xml"),
  `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">
  <application android:label="Gym4Me Staging" tools:replace="android:label" android:networkSecurityConfig="@xml/gym_staging_network" android:usesCleartextTraffic="false" />
</manifest>
`,
);
writeFileSync(
  resolve(app, ".next-native/gym4me-local-staging.json"),
  JSON.stringify({ localStaging: true }),
);
cpSync(resolve(app, ".next-native"), resolve(destination, "assets/public"), {
  recursive: true,
});
for (const name of ["capacitor.config.json", "capacitor.plugins.json"])
  cpSync(
    resolve(app, "android/app/src/main/assets", name),
    resolve(destination, "assets", name),
  );
console.log(
  "Prepared isolated staging Android assets and localhost-only public CA. Build with -PgymLocalStaging=true.",
);
