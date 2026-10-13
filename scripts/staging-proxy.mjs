import https from 'node:https';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Fixed loopback upstreams: this must never become a user-selected open proxy.
export function createStagingProxy({ key, cert, upstreamPort }) {
  const server = https.createServer({ key, cert, minVersion: 'TLSv1.2' }, (req, res) => {
    if (!req.url?.startsWith('/') || req.url.startsWith('//')) {
      res.writeHead(400).end();
      return;
    }
    const headers = { ...req.headers };
    for (const name of ['forwarded', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto', 'connection', 'upgrade', 'proxy-authorization', 'proxy-connection']) delete headers[name];
    headers.host = `127.0.0.1:${upstreamPort}`;
    const upstream = http.request({ hostname: '127.0.0.1', port: upstreamPort, method: req.method, path: req.url, headers }, reply => {
      res.writeHead(reply.statusCode ?? 502, reply.headers);
      reply.on('error', () => res.destroy());
      reply.pipe(res);
    });
    upstream.setTimeout(30000, () => upstream.destroy(new Error('Upstream timeout')));
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end('{"error":"Staging upstream unavailable"}');
      else res.destroy();
    });
    req.on('aborted', () => upstream.destroy());
    res.on('close', () => upstream.destroy());
    req.pipe(upstream);
  });
  server.requestTimeout = 60000;
  server.headersTimeout = 15000;
  return server;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const key = readFileSync(resolve(root, '.staging-tls/server.key'));
  const cert = readFileSync(resolve(root, '.staging-tls/server.crt'));
  const servers = [[7443, 7188], [7181, 7281], [7182, 7282], [7183, 7283]].map(([port, upstreamPort]) => {
    const server = createStagingProxy({ key, cert, upstreamPort });
    server.on('error', () => { console.error(`Staging TLS listener failed on ${port}.`); process.exitCode = 1; for (const active of servers) active.close(); });
    server.listen(port, '127.0.0.1', () => console.log(`HTTPS localhost:${port} -> loopback:${upstreamPort}`));
    return server;
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { for (const server of servers) server.close(); });
}
