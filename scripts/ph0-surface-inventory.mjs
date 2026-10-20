import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, relative, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
if (!process.argv[2])
  throw new Error(
    "An explicit output path is required; historical evidence must not be overwritten by default.",
  );
const surfaces = ["application", "business", "admin"];
const routes = [],
  consumers = [];
for (const surface of surfaces) {
  const app = join(root, "apps", surface);
  for (const directory of ["app", "components"]) {
    let files;
    try {
      files = await readdir(join(app, directory), { recursive: true });
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    for (const file of files.sort()) {
      if (!file.endsWith(".tsx")) continue;
      const path = join(app, directory, file),
        source = await readFile(path, "utf8");
      const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
        (match) => match[1],
      );
      const common = imports.filter(
        (name) =>
          name.startsWith("@repo/ui") ||
          name.includes("/luma/") ||
          name.startsWith("./luma/"),
      );
      const local = relative(root, path);
      if (common.length)
        consumers.push({
          surface,
          source: local,
          imports: common,
          sha256: createHash("sha256").update(source).digest("hex"),
        });
      if (directory === "app" && file.endsWith("page.tsx")) {
        const route =
          "/" +
          dirname(file)
            .split("/")
            .filter((segment) => segment !== "." && !segment.startsWith("("))
            .join("/");
        routes.push({
          surface,
          route,
          source: local,
          imports,
          qaOnly: route.startsWith("/qa/"),
          runtimeAudit: "pending; source inventory is not acceptance evidence",
        });
      }
    }
  }
}
await writeFile(
  resolve(root, process.argv[2]),
  JSON.stringify(
    {
      scope:
        "Static entrypoints and shared-component consumers. API/state/keyboard/visual audits remain separate.",
      routes,
      consumers,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    routes: routes.length,
    consumers: consumers.length,
    bySurface: Object.fromEntries(
      surfaces.map((surface) => [
        surface,
        routes.filter((route) => route.surface === surface).length,
      ]),
    ),
  }),
);
