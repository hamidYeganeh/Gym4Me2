import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import sharp from 'sharp';
import type { DatabaseService } from '../src/database/database.service';
import type { StorageService } from '../src/modules/clubs/storage.service';
import { CoachSamplesService } from '../src/modules/coaching/samples.service';
const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
suite('coach before-and-after samples', () => {
  let pool: Pool, service: CoachSamplesService, file: Express.Multer.File;
  const actor = randomUUID(),
    other = randomUUID();
  const objects = new Map<string, Buffer>();
  let username: string;
  const storage = {
    put: jest.fn((key: string, bytes: Buffer) => {
      objects.set(key, bytes);
      return Promise.resolve();
    }),
    delete: jest.fn((key: string) => {
      objects.delete(key);
      return Promise.resolve();
    }),
    get: jest.fn((key: string) => Promise.resolve(objects.get(key)!)),
    preview: jest.fn((key: string) =>
      Promise.resolve({ url: key, expiresIn: 60 }),
    ),
  };
  beforeAll(async () => {
    if (!url || !new URL(url).pathname.endsWith('_test'))
      throw new Error('Dedicated _test database required');
    pool = new Pool({ connectionString: url, max: 8 });
    await migrate(drizzle(pool), {
      migrationsFolder: resolve(__dirname, '../database/migrations'),
    });
    await pool.query(
      'INSERT INTO users(id,phone,profile_public) VALUES($1,$3,true),($2,$4,true)',
      [
        actor,
        other,
        `sample-${actor.slice(0, 12)}`,
        `sample-${other.slice(0, 12)}`,
      ],
    );
    await pool.query('INSERT INTO coach_profiles(user_id) VALUES($1),($2)', [
      actor,
      other,
    ]);
    await pool.query(
      "INSERT INTO coaching_practices(user_id,review_status,review_expires_at,published) VALUES($1,'approved',now()+interval '1 year',true),($2,'approved',now()+interval '1 year',true)",
      [actor, other],
    );
    username = (
      await pool.query<{ public_id: string }>(
        'SELECT public_id FROM coaching_practices WHERE user_id=$1',
        [actor],
      )
    ).rows[0].public_id;
    service = new CoachSamplesService(
      { db: drizzle(pool) } as unknown as DatabaseService,
      storage as unknown as StorageService,
    );
    const buffer = await sharp({
      create: { width: 20, height: 30, channels: 3, background: '#336699' },
    })
      .png()
      .toBuffer();
    file = {
      buffer,
      mimetype: 'image/png',
      size: buffer.length,
    } as Express.Multer.File;
  }, 30000);
  afterAll(async () => {
    if (pool) {
      try {
        await pool.query(
          'DELETE FROM coaching_practices WHERE user_id IN ($1,$2)',
          [actor, other],
        );
        await pool.query(
          'DELETE FROM coach_profiles WHERE user_id IN ($1,$2)',
          [actor, other],
        );
        await pool.query('DELETE FROM users WHERE id IN ($1,$2)', [
          actor,
          other,
        ]);
      } finally {
        await pool.end();
      }
    }
  });
  it('enforces five pairs even with concurrent additions', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, (_, i) =>
        service.save(
          actor,
          undefined,
          { title: `Sample ${i}` },
          { before: [file], after: [file] },
        ),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(5);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(await service.own(actor)).toHaveLength(5);
    expect(objects.size).toBe(10);
  });
  it('denies other coaches and rejects stale edits', async () => {
    const [s] = await service.own(actor);
    await expect(
      service.save(other, s.id, { title: 'Stolen', revision: s.revision }, {}),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.action(other, s.id, { action: 'delete', revision: s.revision }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await service.save(
      actor,
      s.id,
      { title: 'Updated caption', revision: s.revision },
      {},
    );
    await expect(
      service.save(actor, s.id, { title: 'Stale', revision: s.revision }, {}),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('swaps images, reorders pairs and replaces only the selected image', async () => {
    const [s] = await service.own(actor);
    await service.action(actor, s.id, { action: 'swap', revision: s.revision });
    let updated = (await service.own(actor))[0];
    expect(updated.before).toBe(s.after);
    expect(updated.after).toBe(s.before);
    await service.action(actor, updated.id, {
      action: 'down',
      revision: updated.revision,
    });
    updated = (await service.own(actor))[1];
    expect(updated.id).toBe(s.id);
    const oldBefore = updated.before;
    await service.save(
      actor,
      updated.id,
      { title: updated.title, revision: updated.revision },
      { before: [file] },
    );
    const replaced = (await service.own(actor))[1];
    expect(replaced.before).not.toBe(oldBefore);
    expect(replaced.after).toBe(updated.after);
    expect(objects.has(oldBefore)).toBe(false);
    expect(objects.size).toBe(10);
    expect((await sharp(objects.get(replaced.before)).metadata()).format).toBe(
      'webp',
    );
  });
  it('deletes files and compacts positions so another pair can be added', async () => {
    const s = (await service.own(actor))[2];
    await service.action(actor, s.id, {
      action: 'delete',
      revision: s.revision,
    });
    expect(objects.has(s.before)).toBe(false);
    expect(objects.has(s.after)).toBe(false);
    await service.save(
      actor,
      undefined,
      { title: 'Replacement' },
      { before: [file], after: [file] },
    );
    expect(
      (
        await pool.query<{ position: number }>(
          'SELECT position FROM coach_samples WHERE coach_id=$1 ORDER BY position',
          [actor],
        )
      ).rows.map((r) => r.position),
    ).toEqual([0, 1, 2, 3, 4]);
  });
  it('publishes the ordered array only while the coach profile is visible', async () => {
    const list = await service.publicList(username);
    expect(list).toHaveLength(5);
    expect(list[0]).not.toHaveProperty('before_key');
    expect((await service.media(list[0].id, 'before')).length).toBeGreaterThan(
      0,
    );
    await pool.query(
      'UPDATE coaching_practices SET published=false WHERE user_id=$1',
      [actor],
    );
    expect(await service.publicList(username)).toEqual([]);
    await expect(service.media(list[0].id, 'after')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(await service.own(actor)).toHaveLength(5);
  });
  it('requires two real, bounded images for a new pair', async () => {
    await expect(
      service.save(other, undefined, { title: '' }, { before: [file] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    const bad = { ...file, buffer: Buffer.from('not an image') };
    await expect(
      service.save(
        other,
        undefined,
        { title: '' },
        { before: [bad], after: [file] },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.save(
        other,
        undefined,
        { title: '' },
        { before: [{ ...file, size: 5 * 1024 * 1024 }], after: [file] },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
