import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, ilike } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import * as s from '../../database/schema';
import type { Principal } from '../auth/auth.service';
import { AdminService } from '../admin/admin.service';
import {
  branchCreateSchema,
  mediaSchema,
  spacePatchSchema,
  taxonomyCreateSchema,
  taxonomyPatchSchema,
  type BranchPatch,
  type ClubPatch,
} from './club.contracts';
import {
  invalidatePublication,
  lockClub,
  memberAccess,
  patchBranch,
  patchClub,
  requireBranch,
  taxonomies,
  type TaxonomyKind,
  type Tx,
} from './club.repository';
import {
  publicationReadiness,
  publicClub,
  readBranch,
  readClub,
} from './club.read-model';

@Injectable()
export class ClubService {
  constructor(
    private readonly database: DatabaseService,
    private readonly admin: AdminService,
  ) {}
  async write<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    try {
      return await this.database.db.transaction(work);
    } catch (error) {
      const cause = error as { code?: string; cause?: { code?: string } };
      const code = cause.code ?? cause.cause?.code;
      if (code === '23505')
        throw new ConflictException('این شناسه یا ارتباط قبلاً ثبت شده است.');
      if (['23503', '23514', '23502'].includes(code ?? ''))
        throw new BadRequestException(
          'ارتباط، محدوده مالکیت یا مقدار واردشده معتبر نیست.',
        );
      throw error;
    }
  }
  async create(userId: string, input: ClubPatch & { name: string }) {
    const id = await this.write(async (tx) => {
      const [org] = await tx
        .insert(s.organizations)
        .values({
          name: input.name,
          slug: input.slug ?? `club-${randomUUID()}`,
        })
        .returning();
      await tx
        .insert(s.organizationMembers)
        .values({ organizationId: org.id, userId, role: 'owner' });
      await tx.insert(s.clubs).values({ id: org.id, ownerId: userId });
      const [branch] = await tx
        .insert(s.branches)
        .values({ organizationId: org.id, name: input.name, slug: 'main' })
        .returning();
      await tx
        .insert(s.branchProfiles)
        .values({ clubId: org.id, branchId: branch.id, isMain: true });
      await patchClub(tx, org.id, input);
      await this.audit(tx, userId, org.id, 'club.created', org.id);
      return org.id;
    });
    return readClub(this.database.db, id);
  }
  async own(userId: string, id: string) {
    await memberAccess(this.database.db, userId, id);
    return readClub(this.database.db, id);
  }
  async update(userId: string, id: string, input: ClubPatch) {
    await this.write(async (tx) => {
      await lockClub(tx, userId, id);
      await patchClub(tx, id, input);
      await invalidatePublication(tx, id);
      await this.audit(tx, userId, id, 'club.updated', id);
    });
    return this.own(userId, id);
  }
  async createBranch(
    userId: string,
    clubId: string,
    input: z.infer<typeof branchCreateSchema>,
  ) {
    const id = await this.write(async (tx) => {
      await lockClub(tx, userId, clubId);
      const [branch] = await tx
        .insert(s.branches)
        .values({
          organizationId: clubId,
          name: input.name,
          slug: `branch-${randomUUID()}`,
        })
        .returning();
      await tx.insert(s.branchProfiles).values({ branchId: branch.id, clubId });
      await patchBranch(tx, clubId, branch.id, input);
      await invalidatePublication(tx, clubId);
      await this.audit(tx, userId, clubId, 'branch.updated', branch.id);
      return branch.id;
    });
    return readBranch(this.database.db, clubId, id);
  }
  async branch(userId: string, clubId: string, id: string) {
    await memberAccess(this.database.db, userId, clubId);
    return readBranch(this.database.db, clubId, id);
  }
  async updateBranch(
    userId: string,
    clubId: string,
    id: string,
    input: BranchPatch,
  ) {
    await this.write(async (tx) => {
      await lockClub(tx, userId, clubId);
      await patchBranch(tx, clubId, id, input);
      await invalidatePublication(tx, clubId);
      await this.audit(tx, userId, clubId, 'branch.updated', id);
    });
    return this.branch(userId, clubId, id);
  }
  async readiness(userId: string, id: string) {
    await memberAccess(this.database.db, userId, id);
    return publicationReadiness(this.database.db, id);
  }
  async publication(
    userId: string,
    id: string,
    action: 'submit' | 'publish' | 'hide' | 'archive',
  ) {
    return this.write(async (tx) => {
      const club = await lockClub(tx, userId, id);
      if (action === 'archive' && club.ownerId !== userId)
        throw new ForbiddenException(
          'فقط مالک می‌تواند باشگاه را بایگانی کند.',
        );
      if (action === 'submit' || action === 'publish') {
        const readiness = await publicationReadiness(tx, id);
        if (!readiness.ready)
          throw new BadRequestException({
            message: 'اطلاعات لازم برای انتشار کامل نیست.',
            fields: readiness.errors,
          });
        const [org] = await tx
          .select()
          .from(s.organizations)
          .where(eq(s.organizations.id, id));
        if (org.status === 'suspended')
          throw new ForbiddenException('باشگاه تعلیق شده است.');
        if (action === 'publish' && org.status !== 'approved')
          throw new ForbiddenException('تأیید ادمین برای انتشار لازم است.');
        if (action === 'submit')
          await tx
            .update(s.organizations)
            .set({ status: 'pending', reviewReason: null })
            .where(eq(s.organizations.id, id));
      }
      const publicationStatus =
        action === 'publish'
          ? 'published'
          : action === 'submit'
            ? 'pending_review'
            : 'hidden';
      await tx
        .update(s.clubs)
        .set({
          publicationStatus,
          ...(action === 'archive' ? { archivedAt: new Date() } : {}),
          updatedAt: new Date(),
        })
        .where(eq(s.clubs.id, id));
      await this.audit(tx, userId, id, `club.${action}`, id);
      return { publicationStatus };
    });
  }
  async media(userId: string, id: string, input: z.infer<typeof mediaSchema>) {
    return this.write(async (tx) => {
      await lockClub(tx, userId, id);
      const [media] = await tx
        .insert(s.clubMedia)
        .values({ ...input, organizationId: id, uploadedBy: userId })
        .returning();
      return media;
    });
  }
  async saveSpace(
    userId: string,
    clubId: string,
    branchId: string,
    input: z.infer<typeof spacePatchSchema>,
    spaceId?: string,
  ) {
    return this.write(async (tx) => {
      await lockClub(tx, userId, clubId);
      await requireBranch(tx, clubId, branchId);
      let space: typeof s.spaces.$inferSelect | undefined;
      if (spaceId) {
        [space] = await tx
          .update(s.spaces)
          .set({ ...input, updatedAt: new Date() })
          .where(and(eq(s.spaces.id, spaceId), eq(s.spaces.branchId, branchId)))
          .returning();
      } else {
        if (!input.name)
          throw new BadRequestException('نام فضای ورزشی لازم است.');
        [space] = await tx
          .insert(s.spaces)
          .values({ ...input, name: input.name, branchId })
          .returning();
      }
      if (!space) throw new NotFoundException('فضای ورزشی پیدا نشد.');
      await invalidatePublication(tx, clubId);
      await this.audit(tx, userId, clubId, 'space.saved', space.id);
      return space;
    });
  }
  async listPublic(page: number, search: string) {
    const needle = search.replace(/[\\%_]/g, '\\$&');
    return this.database.db
      .select({
        id: s.clubs.id,
        name: s.organizations.name,
        slug: s.organizations.slug,
        shortDescription: s.clubs.shortDescription,
        operatingStatus: s.clubs.operatingStatus,
      })
      .from(s.clubs)
      .innerJoin(s.organizations, eq(s.organizations.id, s.clubs.id))
      .where(
        and(
          publicClub(),
          search ? ilike(s.organizations.name, `%${needle}%`) : undefined,
        ),
      )
      .orderBy(desc(s.clubs.createdAt), s.clubs.id)
      .limit(25)
      .offset((page - 1) * 25);
  }
  adminDetail(id: string) {
    return readClub(this.database.db, id);
  }
  adminBranch(id: string, branchId: string) {
    return readBranch(this.database.db, id, branchId);
  }
  publicDetail(id: string) {
    return readClub(this.database.db, id, true);
  }
  async publicBranch(id: string, branchId: string) {
    await readClub(this.database.db, id, true);
    return readBranch(this.database.db, id, branchId, true);
  }
  async listTaxonomy(
    kind: TaxonomyKind,
    page: number,
    includeInactive = false,
  ) {
    const t = taxonomies[kind];
    return this.database.db
      .select()
      .from(t)
      .where(includeInactive ? undefined : eq(t.isActive, true))
      .orderBy(t.name, t.id)
      .limit(100)
      .offset((page - 1) * 100);
  }
  async saveTaxonomy(
    p: Principal,
    kind: TaxonomyKind,
    input: z.infer<typeof taxonomyPatchSchema>,
    id?: string,
  ) {
    await this.admin.requireAdmin(p);
    const t = taxonomies[kind];
    return this.write(async (tx) => {
      const [row] = id
        ? await tx
            .update(t)
            .set({ ...input, updatedAt: new Date() })
            .where(eq(t.id, id))
            .returning()
        : await tx
            .insert(t)
            .values(input as z.infer<typeof taxonomyCreateSchema>)
            .returning();
      if (!row) throw new NotFoundException('مورد پیدا نشد.');
      await tx.insert(s.auditEvents).values({
        actorId: p.user.id,
        action: 'catalog.updated',
        targetId: row.id,
        details: { kind },
      });
      return row;
    });
  }
  async geography(
    kind: 'countries' | 'provinces' | 'cities' | 'districts',
    parentId?: string,
  ) {
    if (kind === 'countries')
      return this.database.db
        .select()
        .from(s.countries)
        .orderBy(s.countries.name)
        .limit(300);
    if (!parentId) throw new BadRequestException('شناسه والد لازم است.');
    if (kind === 'provinces')
      return this.database.db
        .select()
        .from(s.provinces)
        .where(eq(s.provinces.countryId, parentId))
        .orderBy(s.provinces.name)
        .limit(1000);
    if (kind === 'cities')
      return this.database.db
        .select()
        .from(s.cities)
        .where(eq(s.cities.provinceId, parentId))
        .orderBy(s.cities.name)
        .limit(1000);
    return this.database.db
      .select()
      .from(s.districts)
      .where(eq(s.districts.cityId, parentId))
      .orderBy(s.districts.name)
      .limit(1000);
  }
  async createGeography(
    p: Principal,
    input: {
      kind: 'countries' | 'provinces' | 'cities' | 'districts';
      name: string;
      parentId?: string;
      code?: string;
    },
  ) {
    await this.admin.requireAdmin(p);
    return this.write(async (tx) => {
      if (input.kind === 'countries') {
        if (!input.code) throw new BadRequestException('کد کشور لازم است.');
        const [row] = await tx
          .insert(s.countries)
          .values({ name: input.name, code: input.code })
          .returning();
        return row;
      }
      if (!input.parentId)
        throw new BadRequestException('شناسه والد لازم است.');
      if (input.kind === 'provinces')
        return (
          await tx
            .insert(s.provinces)
            .values({ name: input.name, countryId: input.parentId })
            .returning()
        )[0];
      if (input.kind === 'cities')
        return (
          await tx
            .insert(s.cities)
            .values({ name: input.name, provinceId: input.parentId })
            .returning()
        )[0];
      return (
        await tx
          .insert(s.districts)
          .values({ name: input.name, cityId: input.parentId })
          .returning()
      )[0];
    });
  }
  private async audit(
    tx: Tx,
    userId: string,
    clubId: string,
    action: string,
    targetId: string,
  ) {
    await tx
      .insert(s.auditEvents)
      .values({ actorId: userId, organizationId: clubId, action, targetId });
  }
}
