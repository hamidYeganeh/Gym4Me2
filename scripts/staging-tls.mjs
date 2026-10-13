import { mkdtempSync, chmodSync, writeFileSync, renameSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('..', import.meta.url));
const destination = resolve(root, '.staging-tls');
if (existsSync(destination)) throw new Error('TLS material already exists; refusing to replace it.');
process.umask(0o077);
const temporary = mkdtempSync(resolve(root, '.staging-tls-'));
chmodSync(temporary, 0o700);
function openssl(args) {
  const result = spawnSync('openssl', args, { cwd: temporary, stdio: 'pipe' });
  if (result.status !== 0) throw new Error('OpenSSL certificate generation failed.');
}
try {
  openssl(['req', '-x509', '-newkey', 'rsa:3072', '-nodes', '-sha256', '-days', '365', '-subj', '/CN=Gym4Me Local Staging CA', '-keyout', 'ca.key', '-out', 'ca.crt', '-addext', 'basicConstraints=critical,CA:TRUE,pathlen:0', '-addext', 'keyUsage=critical,keyCertSign,cRLSign']);
  openssl(['req', '-newkey', 'rsa:3072', '-nodes', '-sha256', '-subj', '/CN=localhost', '-keyout', 'server.key', '-out', 'server.csr']);
  writeFileSync(resolve(temporary, 'server.ext'), 'basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\nsubjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1\n');
  openssl(['x509', '-req', '-in', 'server.csr', '-CA', 'ca.crt', '-CAkey', 'ca.key', '-CAcreateserial', '-days', '90', '-sha256', '-extfile', 'server.ext', '-out', 'server.crt']);
  openssl(['verify', '-CAfile', 'ca.crt', '-verify_hostname', 'localhost', 'server.crt']);
  renameSync(temporary, destination);
  console.log('Created private local TLS material. No system or device trust settings were changed.');
} finally {
  if (existsSync(temporary)) rmSync(temporary, { recursive: true });
}
