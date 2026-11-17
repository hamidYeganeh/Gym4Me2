import { spawnSync } from "node:child_process";

// Each frontend resolves @/ relative to its own tsconfig.
const groups = [
  ["packages", "apps/backend", "apps/storybook"],
  ...["admin", "application", "business"].map((name) => [
    `apps/${name}`,
    "--ts-config",
    `apps/${name}/tsconfig.json`,
  ]),
];

for (const group of groups) {
  const result = spawnSync("depcruise", ["--config", ".dependency-cruiser.cjs", ...group], {
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
