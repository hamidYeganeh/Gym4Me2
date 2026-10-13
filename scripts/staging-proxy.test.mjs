import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import https from 'node:https';
import { readFileSync } from 'node:fs';
import { createStagingProxy } from './staging-proxy.mjs';
const ca = readFileSync(new URL('../.staging-tls/ca.crt', import.meta.url));
const key = readFileSync(new URL('../.staging-tls/server.key', import.meta.url));
const cert = readFileSync(new URL('../.staging-tls/server.crt', import.meta.url));
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const close = server => new Promise(resolve => server.close(resolve));
function request(port, overrides = {}, body = '') {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: '127.0.0.1', port, path: '/api/v1/probe?lang=fa', method: 'POST', ca, ...overrides }, res => {
      let text = ''; res.setEncoding('utf8'); res.on('data', chunk => text += chunk); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text }));
    });
    req.on('error', reject); req.end(body);
  });
}
test('local TLS verifies identity, streams requests and fails closed on unavailable upstream', async () => {
  const backend = http.createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    res.writeHead(201, { 'set-cookie': 'session=test; HttpOnly; Secure; SameSite=Lax' });
    res.end(JSON.stringify({ body, path: req.url, forwarded: req.headers['x-forwarded-for'] ?? null }));
  });
  const upstreamPort = await listen(backend);
  const proxy = createStagingProxy({ key, cert, upstreamPort });
  const port = await listen(proxy);
  try {
    const result = await request(port, { headers: { 'x-forwarded-for': 'spoofed' } }, 'payload');
    assert.equal(result.status, 201);
    assert.deepEqual(JSON.parse(result.text), { body: 'payload', path: '/api/v1/probe?lang=fa', forwarded: null });
    assert.match(result.headers['set-cookie'][0], /Secure/);
    await assert.rejects(request(port, { ca: undefined }));
    await assert.rejects(request(port, { servername: 'wrong.example' }), { code: 'ERR_TLS_CERT_ALTNAME_INVALID' });
    assert.equal((await request(port, { path: '//external.invalid/' })).status, 400);
    await close(backend);
    assert.equal((await request(port)).status, 502);
  } finally { await close(proxy); if (backend.listening) await close(backend); }
});
