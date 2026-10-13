import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { open, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { RetentionService } from '../src/modules/profile/retention.service';
config({ path: resolve(__dirname, '../.env'), quiet: true });
process.env.RETENTION_ENABLED = 'false';
async function main() {
  const [action, file, snapshotAt, flag, ...extra] = process.argv.slice(2);
  if (
    !file ||
    extra.length ||
    (action === 'export'
      ? !!snapshotAt || !!flag
      : action !== 'replay' ||
        !snapshotAt ||
        (flag !== undefined && flag !== '--apply'))
  )
    throw new Error('Use export FILE or replay FILE SNAPSHOT_ISO [--apply].');
  const { AppModule } = createRequire(__filename)(
    '../src/app.module',
  ) as typeof import('../src/app.module');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
    abortOnError: false,
  });
  try {
    const retention = app.get(RetentionService);
    if (action === 'export') {
      const ledger = await retention.exportDeletionLedger();
      await writeFile(resolve(file), JSON.stringify(ledger, null, 2), {
        flag: 'wx',
        mode: 0o600,
      });
      console.log(
        JSON.stringify({
          exported: ledger.entries.length,
          exportedAt: ledger.exportedAt,
        }),
      );
    } else {
      // No symlinks, oversized files, group/world-readable ledgers or files
      // belonging to another user. The operator must supply a trusted ledger.
      const handle = await open(
        resolve(file),
        constants.O_RDONLY | constants.O_NOFOLLOW,
      );
      let input: unknown;
      try {
        const stat = await handle.stat();
        if (
          !stat.isFile() ||
          stat.size > 10 * 1024 * 1024 ||
          stat.mode & 0o077 ||
          (process.getuid && stat.uid !== process.getuid())
        )
          throw new Error('Expected a private, operator-owned ledger.');
        input = JSON.parse(await handle.readFile('utf8')) as unknown;
      } finally {
        await handle.close();
      }
      console.log(
        JSON.stringify(
          await retention.replayDeletionLedger(
            input,
            new Date(snapshotAt),
            flag === '--apply',
          ),
        ),
      );
    }
  } finally {
    await app.close();
  }
}
void main().catch(() => {
  console.error(
    'Deletion ledger operation failed. Keep the restored API offline; check the trusted ledger, snapshot time and restored responsibilities.',
  );
  process.exitCode = 1;
});
