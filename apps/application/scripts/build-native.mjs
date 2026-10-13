import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const appDirectory = fileURLToPath(new URL("..", import.meta.url));
const nextRequire = createRequire(require.resolve("next/package.json"));
nextRequire("@next/env").loadEnvConfig(appDirectory, false);
const endpoint = process.env.NEXT_PUBLIC_API_URL;
if (endpoint && new URL(endpoint).protocol !== "https:")
  throw new Error("Native exports require an HTTPS NEXT_PUBLIC_API_URL.");
if (!endpoint)
  console.warn(
    "NEXT_PUBLIC_API_URL is unset. Public catalog and account features require a configured API.",
  );
// Export the static client shell from an isolated staging directory. Web-only dynamic
// routes stay in the web application; live native IDs use /discovery/club?id=… .
const stage = mkdtempSync(join(appDirectory, ".native-build-"));
let result;
try {
  cpSync(join(appDirectory, "app"), join(stage, "app"), {
    recursive: true,
    filter: (source) =>
      !["clubs", "coaches"].some(
        (name) => source === join(appDirectory, "app/discovery", name),
      ),
  });
  for (const name of [
    "components",
    "lib",
    "i18n",
    "public",
    "node_modules",
    "next.config.ts",
    "next-env.d.ts",
  ]) {
    const source = join(appDirectory, name);
    if (existsSync(source)) symlinkSync(source, join(stage, name));
  }
  writeFileSync(
    join(stage, "package.json"),
    readFileSync(join(appDirectory, "package.json")),
  );
  const tsconfig = JSON.parse(
    readFileSync(join(appDirectory, "tsconfig.json"), "utf8"),
  );
  tsconfig.exclude = [...tsconfig.exclude, ".native-build-*"];
  writeFileSync(join(stage, "tsconfig.json"), JSON.stringify(tsconfig));
  result = spawnSync(
    process.execPath,
    [require.resolve("next/dist/bin/next"), "build", "--webpack"],
    {
      stdio: "inherit",
      cwd: stage,
      env: { ...process.env, NEXT_PUBLIC_NATIVE_EXPORT: "true" },
    },
  );
  if (result.status === 0) {
    const exported = [join(stage, ".next-native"), join(stage, "out")].find(
      (directory) => existsSync(join(directory, "index.html")),
    );
    if (!exported)
      throw new Error("Native build succeeded without an exported index.html.");
    const destination = join(appDirectory, ".next-native");
    const backup = join(appDirectory, ".next-native-previous");
    rmSync(backup, { recursive: true, force: true });
    if (existsSync(destination)) renameSync(destination, backup);
    try {
      renameSync(exported, destination);
    } catch (error) {
      if (existsSync(backup)) renameSync(backup, destination);
      throw error;
    }
    rmSync(backup, { recursive: true, force: true });
  }
} finally {
  rmSync(stage, { recursive: true, force: true });
}
process.exit(result?.status ?? 1);
