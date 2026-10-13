import assert from "node:assert/strict";
import https from "node:https";
import { readFileSync } from "node:fs";
const ca = readFileSync(new URL("../.staging-tls/ca.crt", import.meta.url));
function get(port, path, app) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      {
        hostname: "127.0.0.1",
        port,
        path,
        ca,
        headers: {
          "accept-language": "fa",
          "x-gym-client": app,
          referer: `https://localhost:${port}/login`,
        },
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode, body }));
      },
    );
    req.setTimeout(10000, () =>
      req.destroy(new Error("Staging request timed out")),
    );
    req.on("error", reject);
  });
}
for (const [app, port] of [
  ["application", 7181],
  ["admin", 7182],
  ["business", 7183],
]) {
  const routes = JSON.parse(
    readFileSync(
      new URL(
        `../apps/${app}/.next-staging/routes-manifest.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const rewrite = routes.rewrites.afterFiles.find(
    (rule) => rule.source === "/api/:path*",
  );
  assert.equal(rewrite.destination, "http://127.0.0.1:7188/api/:path*");
  const login = await get(port, "/login", app);
  assert.equal(login.status, 200, `${app} login`);
  assert.match(login.body, /<html/);
  const health = await get(port, "/api/v1/system/health/ready", app);
  assert.equal(health.status, 200, `${app} health rewrite`);
  assert.deepEqual(JSON.parse(health.body).checks, {
    database: "up",
    storage: "up",
  });
  const privateAccount = await get(port, "/api/v1/profile/account", app);
  assert.equal(
    privateAccount.status,
    401,
    `${app} anonymous account must be denied`,
  );
  console.log(
    `${app}: verified TLS, login HTML, staging API routing/readiness and anonymous denial`,
  );
}
