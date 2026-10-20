import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const escape = (s) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
/** Pure generation; no launchctl, Docker, build, migration or secret reads. */
export function operationsServices(directory = root, node = process.execPath) {
  return [
    "infrastructure",
    "api",
    "application",
    "admin",
    "business",
    "proxy",
    "backup",
    "monitor",
  ].map((name) => {
    const script =
      name === "backup"
        ? "operations-worker.mjs"
        : name === "monitor"
          ? "staging-monitor.mjs"
          : "staging-service.mjs";
    const argument = ["backup", "monitor"].includes(name) ? "--watch" : name;
    const log = resolve(directory, `.artifacts/operations/${name}.log`);
    const keepAlive =
      name === "infrastructure"
        ? "<dict><key>SuccessfulExit</key><false/></dict>"
        : "<true/>";
    return {
      name,
      filename: `ir.gym4me.${name}.plist`,
      content: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>ir.gym4me.${name}</string>
<key>ProgramArguments</key><array><string>${escape(node)}</string><string>${escape(resolve(directory, "scripts", script))}</string><string>${argument}</string></array>
<key>WorkingDirectory</key><string>${escape(directory)}</string>
<key>EnvironmentVariables</key><dict><key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string></dict>
<key>Umask</key><integer>63</integer>
<key>RunAtLoad</key><true/><key>KeepAlive</key>${keepAlive}<key>ThrottleInterval</key><integer>30</integer>
<key>ExitTimeOut</key><integer>25</integer>
<key>StandardOutPath</key><string>${escape(log)}</string><key>StandardErrorPath</key><string>${escape(log)}</string>
</dict></plist>\n`,
    };
  });
}

export function generateOperationsServices(
  directory = root,
  output = resolve(directory, ".artifacts/operations/services"),
) {
  mkdirSync(output, { recursive: true, mode: 0o700 });
  const definitions = operationsServices(directory);
  for (const service of definitions)
    writeFileSync(resolve(output, service.filename), service.content, {
      mode: 0o600,
    });
  return definitions.map(({ name }) => name);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.length !== 2)
    throw new Error("Generate service definitions without arguments.");
  const names = generateOperationsServices();
  console.log(
    `Generated ${names.length} launchd staging/backup/monitor definitions. No service was installed or started; prebuild/migrate staging before explicit operator installation.`,
  );
}
