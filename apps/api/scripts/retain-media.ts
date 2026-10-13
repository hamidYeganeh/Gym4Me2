import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { MediaRetentionService } from '../src/modules/clubs/media-retention.service';
config({ path: resolve(__dirname, '../.env'), quiet: true });
process.env.RETENTION_ENABLED = 'false';
async function main() {
  const args = process.argv.slice(2);
  if (
    args.some((arg) => !['--apply', '--dry-run'].includes(arg)) ||
    (args.includes('--apply') && args.includes('--dry-run'))
  )
    throw new Error('Use --dry-run (default) or --apply.');
  const { AppModule } = createRequire(__filename)(
    '../src/app.module',
  ) as typeof import('../src/app.module');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
    abortOnError: false,
  });
  try {
    console.log(
      JSON.stringify(
        await app.get(MediaRetentionService).run(args.includes('--apply')),
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}
void main().catch(() => {
  console.error(
    'Media retention failed. Previously completed items may have been removed; retry is safe.',
  );
  process.exitCode = 1;
});
