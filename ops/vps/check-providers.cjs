// Run from the release root with systemd-run and EnvironmentFile=/etc/gym4me/api.env
// so quoted service-account JSON is interpreted exactly as in the API service.
// Reports status only; never print provider responses, keys, tokens or recipients.
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const { randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');
const apiRequire = createRequire(resolve(process.cwd(), 'apps/api/package.json'));

async function check(name, operation) {
  try {
    const detail = await operation();
    console.log(JSON.stringify({ provider: name, status: 'ok', ...detail }));
  } catch (error) {
    console.log(JSON.stringify({ provider: name, status: 'failed', code: error.safeCode || 'connection-or-credentials' }));
    process.exitCode = 1;
  }
}

async function main() {
  await check('neshan-map', async () => {
    const { parse } = apiRequire('dotenv');
    const config = parse(readFileSync(resolve(process.cwd(), 'apps/application/.env.production')));
    const url = new URL('https://api.neshan.org/basemap/v2/10/658/403/sdk');
    url.searchParams.set('key', config.NEXT_PUBLIC_NESHAN_MAP_KEY);
    const response = await fetch(url, {
      headers: { Origin: 'https://app.gym4me.ir', Referer: 'https://app.gym4me.ir/' },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) { const error = new Error(); error.safeCode = `http-${response.status}`; throw error; }
    if ((await response.arrayBuffer()).byteLength === 0) throw new Error();
    return { tileFetched: true };
  });
  await check('storage', async () => {
    const { S3Client, HeadBucketCommand } = apiRequire('@aws-sdk/client-s3');
    const client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION,
      forcePathStyle: true,
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
    });
    try { await client.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET })); }
    finally { client.destroy(); }
    return {};
  });
  await check('kavenegar', async () => {
    const response = await fetch(`https://api.kavenegar.com/v1/${process.env.KAVENEGAR_API_KEY}/account/info.json`, { signal: AbortSignal.timeout(30000) });
    const data = await response.json();
    if (!response.ok || data.return?.status !== 200) {
      const error = new Error(); error.safeCode = `provider-${data.return?.status ?? response.status}`; throw error;
    }
    return { creditAvailable: Number(data.entries?.remaincredit) > 0, smsSent: false };
  });
  await check('fcm', async () => {
    const { GoogleAuth } = apiRequire('google-auth-library');
    const credentials = JSON.parse(process.env.FCM_SERVICE_ACCOUNT_JSON);
    const auth = new GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/firebase.messaging'] });
    const token = await auth.getAccessToken();
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${credentials.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ validate_only: true, message: { topic: 'gym4me-deployment-check', data: { deploymentCheck: '1' } } }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      const data = await response.json(); const error = new Error();
      error.safeCode = `${response.status}-${data.error?.status ?? 'rejected'}`; throw error;
    }
    return { validationOnly: true, notificationSent: false };
  });
  await check('saman-sandbox', async () => {
    const { ConfigService } = apiRequire('@nestjs/config');
    const { SamanSandboxPaymentAdapter } = apiRequire('./dist/modules/commerce/saman-sandbox.js');
    const adapter = new SamanSandboxPaymentAdapter(new ConfigService(process.env));
    const result = await adapter.create(randomUUID(), '10000', 'success');
    if (result.state !== 'pending') throw new Error();
    return { sandboxTokenCreated: true, paymentMade: false };
  });
}
main().catch(() => { console.error('Provider check failed'); process.exitCode = 1; });
