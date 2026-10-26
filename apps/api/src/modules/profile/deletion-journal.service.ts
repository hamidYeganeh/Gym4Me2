import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
import type { Environment } from '../../config/environment';
import {
  deletionRecordPrefix,
  sealDeletionRecord,
} from './deletion-journal.crypto';

@Injectable()
export class DeletionJournalService {
  constructor(private readonly config: ConfigService<Environment, true>) {}

  assertConfigured() {
    if (
      this.config.get('DELETION_JOURNAL_PROVIDER', { infer: true }) !==
        'vercel-blob' &&
      this.config.get('NODE_ENV', { infer: true }) !== 'test'
    )
      throw new Error('Independent deletion journal is not configured.');
  }

  async record(userId: string, deletedAt: Date) {
    this.assertConfigured();
    const provider = this.config.get('DELETION_JOURNAL_PROVIDER', {
      infer: true,
    });
    // Isolated test databases deliberately have no production storage credential.
    if (
      provider === 'disabled' &&
      this.config.get('NODE_ENV', { infer: true }) === 'test'
    )
      return;
    if (provider !== 'vercel-blob')
      throw new Error('Independent deletion journal is not configured.');
    const bytes = sealDeletionRecord(
      { version: 1, userId, deletedAt: deletedAt.toISOString() },
      this.config.get('DELETION_JOURNAL_RECIPIENT_KEY', { infer: true })!,
    );
    // Append each attempt. A lost acknowledgement can create another encrypted
    // receipt, never overwrite an earlier one. Recovery deduplicates by identity.
    try {
      await put(`${deletionRecordPrefix(userId)}${randomUUID()}.bin`, bytes, {
        access: 'private',
        token: this.config.get('BLOB_READ_WRITE_TOKEN', { infer: true }),
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: 'application/octet-stream',
        abortSignal: AbortSignal.timeout(8000),
      });
    } catch {
      // Do not include provider errors: they may contain private URLs or tokens.
      throw new Error(
        'Independent deletion journal could not acknowledge the receipt.',
      );
    }
  }
}
