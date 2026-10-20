import { ConfigService } from '@nestjs/config';
import { DemoStorageService } from './demo-storage.service';
import type { DatabaseService } from '../../database/database.service';
import type { Environment } from '../../config/environment';

describe('isolated demo storage', () => {
  const setup = (enabled = true) => {
    const execute = jest.fn().mockResolvedValue({
      rows: [{ body: Buffer.from('image'), content_type: 'image/webp' }],
    });
    const config = new ConfigService<Environment, true>({
      DEMO_MODE: enabled,
      AUTH_SECRET: 'a'.repeat(64),
      PUBLIC_API_ORIGIN: 'https://demo.example.com',
    });
    return {
      storage: new DemoStorageService(
        { db: { execute } } as unknown as DatabaseService,
        config,
      ),
      execute,
    };
  };
  it('rejects disabled, altered and expired preview URLs before reading data', async () => {
    const { storage, execute } = setup();
    const signed = new URL((await storage.preview('private/document')).url)
      .searchParams;
    await expect(
      storage.signedGet(
        'other/document',
        signed.get('expires')!,
        signed.get('proof')!,
      ),
    ).rejects.toThrow();
    await expect(
      storage.signedGet('private/document', '1000000000', signed.get('proof')!),
    ).rejects.toThrow();
    await expect(
      setup(false).storage.signedGet(
        'private/document',
        signed.get('expires')!,
        signed.get('proof')!,
      ),
    ).rejects.toThrow();
    expect(execute).not.toHaveBeenCalled();
  });
  it('reads a valid signed image without exposing an executable content type', async () => {
    const { storage, execute } = setup();
    const signed = new URL((await storage.preview('private/document')).url)
      .searchParams;
    expect(
      (
        await storage.signedGet(
          'private/document',
          signed.get('expires')!,
          signed.get('proof')!,
        )
      ).contentType,
    ).toBe('image/webp');
    execute.mockResolvedValue({
      rows: [{ body: Buffer.from('<html>'), content_type: 'text/html' }],
    });
    expect(
      (
        await storage.signedGet(
          'private/document',
          signed.get('expires')!,
          signed.get('proof')!,
        )
      ).contentType,
    ).toBe('application/octet-stream');
  });
});
