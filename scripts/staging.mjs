import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
const root = fileURLToPath(new URL("..", import.meta.url));
const file = resolve(root, ".env.staging");
const action = process.argv[2];
if (action === "init") {
  const admin = randomBytes(24).toString("hex");
  const migration = randomBytes(24).toString("hex");
  const runtime = randomBytes(24).toString("hex");
  let content = readFileSync(resolve(root, ".env.staging.example"), "utf8");
  content = content
    .replace("STAGE_ADMIN_PASSWORD=replace-me", `STAGE_ADMIN_PASSWORD=${admin}`)
    .replaceAll(
      "STAGE_MIGRATION_PASSWORD=replace-me",
      `STAGE_MIGRATION_PASSWORD=${migration}`,
    )
    .replaceAll(
      "STAGE_RUNTIME_PASSWORD=replace-me",
      `STAGE_RUNTIME_PASSWORD=${runtime}`,
    )
    .replace("gym4me_runtime:replace-me", `gym4me_runtime:${runtime}`)
    .replace("gym4me_migrator:replace-me", `gym4me_migrator:${migration}`)
    .replace(
      "replace-with-at-least-32-random-characters",
      randomBytes(48).toString("hex"),
    )
    .replace(
      "S3_ACCESS_KEY_ID=replace-me",
      `S3_ACCESS_KEY_ID=stage-${randomBytes(8).toString("hex")}`,
    )
    .replace(
      "S3_SECRET_ACCESS_KEY=replace-me",
      `S3_SECRET_ACCESS_KEY=${randomBytes(32).toString("hex")}`,
    );
  writeFileSync(file, content, { flag: "wx", mode: 0o600 });
  console.log("Created private local staging configuration.");
} else {
  const env = { ...process.env, ...parseEnv(readFileSync(file, "utf8")) };
  const apiSecretFile = resolve(root, "apps/api/.env");
  const apiSecrets = existsSync(apiSecretFile)
    ? parseEnv(readFileSync(apiSecretFile, "utf8"))
    : {};
  for (const key of ["KAVENEGAR_API_KEY", "KAVENEGAR_ANDROID_APP_HASH"])
    if (apiSecrets[key]) env[key] = apiSecrets[key];
  if (!["up", "migrate", "verify", "start", "stop"].includes(action))
    throw new Error("Use init, up, migrate, verify, start, or stop.");
  const commands = {
    up: [
      "docker",
      [
        "compose",
        "-f",
        "compose.staging.yaml",
        "--env-file",
        file,
        "up",
        "-d",
        "--wait",
      ],
    ],
    stop: [
      "docker",
      ["compose", "-f", "compose.staging.yaml", "--env-file", file, "stop"],
    ],
    migrate: [process.execPath, ["--import", "tsx", "scripts/migrate.ts"]],
    verify: [
      process.execPath,
      ["--import", "tsx", "scripts/verify-staging.ts"],
    ],
    start: [process.execPath, ["dist/main.js"]],
  };
  if (action === "migrate") env.DATABASE_URL = env.MIGRATION_DATABASE_URL;
  if (action !== "migrate") delete env.MIGRATION_DATABASE_URL;
  delete env.STAGE_ADMIN_PASSWORD; // Docker interpolation reads the explicit env file.
  delete env.STAGE_MIGRATION_PASSWORD;
  delete env.STAGE_RUNTIME_PASSWORD;
  const [command, args] = commands[action];
  const result = spawnSync(command, args, {
    cwd: ["up", "stop"].includes(action) ? root : resolve(root, "apps/api"),
    env,
    stdio: "inherit",
  });
  process.exitCode = result.status ?? 1;
}
