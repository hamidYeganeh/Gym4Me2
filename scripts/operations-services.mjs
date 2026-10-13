import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const output = resolve(root, ".artifacts/operations/services");
mkdirSync(output, { recursive: true, mode: 0o700 });
const escape = (s) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
for (const [name, script] of [
  ["backup", "operations-worker.mjs"],
  ["monitor", "staging-monitor.mjs"],
]) {
  const log = resolve(root, `.artifacts/operations/${name}.log`);
  writeFileSync(
    resolve(output, `ir.gym4me.${name}.plist`),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>ir.gym4me.${name}</string>
<key>ProgramArguments</key><array><string>${escape(process.execPath)}</string><string>${escape(resolve(root, "scripts", script))}</string><string>--watch</string></array>
<key>WorkingDirectory</key><string>${escape(root)}</string>
<key>EnvironmentVariables</key><dict><key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string></dict>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>30</integer>
<key>StandardOutPath</key><string>${escape(log)}</string><key>StandardErrorPath</key><string>${escape(log)}</string>
</dict></plist>\n`,
    { mode: 0o600 },
  );
}
console.log(
  "Generated launchd backup and monitor services under .artifacts/operations/services.",
);
