import { config } from 'dotenv';
import { constants } from 'node:fs';
import { open, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readIndependentDeletionLedger } from '../src/modules/profile/deletion-journal.store';
config({
  path: process.env.DELETION_JOURNAL_ENV_FILE ?? resolve(__dirname, '../.env'),
  quiet: true,
});

async function main() {
  const [destination, keyFile, confirmation, ...extra] = process.argv.slice(2);
  if (
    !destination ||
    !keyFile ||
    confirmation !== '--origin-offline' ||
    extra.length
  )
    throw new Error(
      'Use OUTPUT PRIVATE_KEY --origin-offline after stopping origin writes.',
    );
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token)
    throw new Error('Independent deletion journal credential is required.');
  const handle = await open(
    resolve(keyFile),
    constants.O_RDONLY | constants.O_NOFOLLOW,
  );
  let privateKey: string;
  try {
    const info = await handle.stat();
    if (
      !info.isFile() ||
      info.size > 4096 ||
      info.mode & 0o077 ||
      (process.getuid && info.uid !== process.getuid())
    )
      throw new Error('Expected a private, operator-owned recovery key.');
    privateKey = await handle.readFile('utf8');
  } finally {
    await handle.close();
  }
  const ledger = await readIndependentDeletionLedger(token, privateKey);
  await writeFile(resolve(destination), JSON.stringify(ledger), {
    flag: 'wx',
    mode: 0o600,
  });
  console.log(
    JSON.stringify({
      exported: ledger.entries.length,
      exportedAt: ledger.exportedAt,
    }),
  );
}
void main().catch(() => {
  console.error(
    'Independent journal export failed. Keep the restored service offline; inspect credentials, recovery key and origin quiescence.',
  );
  process.exitCode = 1;
});
