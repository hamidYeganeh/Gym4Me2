import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const serial = process.argv[2];
if (
  !serial ||
  process.argv.length !== 4 ||
  process.argv[3] !== "--allow-app-restart" ||
  !/^[a-zA-Z0-9._:-]+$/.test(serial)
)
  throw new Error(
    "Use DEVICE_SERIAL --allow-app-restart only after manual testing has finished. Instrumentation force-stops the staging app.",
  );
console.log(
  "This run installs and force-stops Gym4Me Staging. Do not use the app until the run finishes.",
);
const sdk =
  process.env.ANDROID_HOME ?? resolve(homedir(), "Library/Android/sdk");
const adb = resolve(sdk, "platform-tools/adb");
function run(command, args, cwd = root, capture = false) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ANDROID_HOME: sdk },
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
  if (result.status !== 0)
    throw new Error("Staging Android verification command failed.");
  return result.stdout;
}
if (run(adb, ["-s", serial, "get-state"], root, true).trim() !== "device")
  throw new Error("Selected device is not ready.");
const android = resolve(root, "apps/application/android");
run(
  resolve(android, "gradlew"),
  [
    ":app:assembleDebug",
    ":app:assembleDebugAndroidTest",
    "-PgymLocalStaging=true",
  ],
  android,
);
const output = resolve(android, "app/build/outputs/apk");
for (const [directory, identity] of [
  ["debug", "com.gym4me.app.staging"],
  ["androidTest/debug", "com.gym4me.app.staging.test"],
]) {
  const metadata = JSON.parse(
    readFileSync(resolve(output, directory, "output-metadata.json"), "utf8"),
  );
  if (metadata.applicationId !== identity || metadata.elements.length !== 1)
    throw new Error("Unexpected APK identity.");
  run(adb, [
    "-s",
    serial,
    "install",
    "-r",
    resolve(output, directory, metadata.elements[0].outputFile),
  ]);
}
run(adb, ["-s", serial, "reverse", "tcp:7443", "tcp:7443"]);
const report = run(
  adb,
  [
    "-s",
    serial,
    "shell",
    "am",
    "instrument",
    "-w",
    "-r",
    "-e",
    "class",
    "com.gym4me.app.StagingConnectivityTest",
    "com.gym4me.app.staging.test/androidx.test.runner.AndroidJUnitRunner",
  ],
  root,
  true,
);
const directory = resolve(root, ".artifacts/ph1");
mkdirSync(directory, { recursive: true });
writeFileSync(resolve(directory, "android-connectivity.txt"), report, {
  mode: 0o600,
});
if (
  !/OK \(3 tests\)/.test(report) ||
  /FAILURES|INSTRUMENTATION_FAILED|INSTRUMENTATION_STATUS_CODE: -[234]/.test(
    report,
  )
)
  throw new Error("Connectivity tests did not all pass; inspect the report.");
console.log(
  "Android device: all 3 staging connectivity tests passed. USB mapping remains for manual acceptance.",
);
