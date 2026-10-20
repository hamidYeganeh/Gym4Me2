import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, ilike, inArray, isNull, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import * as s from '../../database/schema';
import type { Principal } from '../auth/auth.service';
import { lockWritableAccount } from '../auth/account-lock';
import { AdminService } from '../admin/admin.service';
import {
  branchCreateSchema,
  mediaSchema,
  spacePatchSchema,
  taxonomyCreateSchema,
  taxonomyPatchSchema,
  type BranchPatch,
  type ClubPatch,
  type CatalogFilters,
  normalizeCatalogSearch,
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
  publicBranchProfile,
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
        throw new ConflictException(
          'Backend.thisIdentifierOrRelationshipAlreadyExists',
        );
      if (['23503', '23514', '23502'].includes(code ?? ''))
        throw new BadRequestException(
          'Backend.invalidRelationshipOwnershipScopeOrValue',
        );
      throw error;
    }
  }
  async create(userId: string, input: ClubPatch & { name: string }) {
    const id = await this.write(async (tx) => {
      await lockWritableAccount(tx, userId);
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
    const member = await memberAccess(this.database.db, userId, id);
    const club = await readClub(this.database.db, id);
    if (member.role !== 'owner' && !member.allBranches) {
      const allowed = await this.database.db
        .select({ id: s.organizationMemberBranches.branchId })
        .from(s.organizationMemberBranches)
        .where(eq(s.organizationMemberBranches.memberId, member.id));
      club.branches = club.branches.filter((branch) =>
        allowed.some((item) => item.id === branch.id),
      );
      club.tariffs = club.tariffs.filter(
        (tariff) =>
          tariff.branchId === null ||
          allowed.some((item) => item.id === tariff.branchId),
      );
    }
    return club;
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
    await memberAccess(this.database.db, userId, clubId, id);
    return readBranch(this.database.db, clubId, id);
  }
  async updateBranch(
    userId: string,
    clubId: string,
    id: string,
    input: BranchPatch,
  ) {
    await this.write(async (tx) => {
      await lockClub(tx, userId, clubId, id);
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
        throw new ForbiddenException('Backend.onlyTheOwnerCanArchiveAClub');
      if (action === 'submit' || action === 'publish') {
        const readiness = await publicationReadiness(tx, id);
        if (!readiness.ready)
          throw new BadRequestException({
            message: 'Backend.requiredPublicationInformationIsIncomplete',
            fields: readiness.errors,
          });
        const [org] = await tx
          .select()
          .from(s.organizations)
          .where(eq(s.organizations.id, id));
        if (org.status === 'suspended')
          throw new ForbiddenException('Backend.theClubIsSuspended');
        if (action === 'publish' && org.status !== 'approved')
          throw new ForbiddenException(
            'Backend.administratorApprovalIsRequiredBeforePublication',
          );
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
      await lockClub(tx, userId, clubId, branchId);
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
          throw new BadRequestException('Backend.aTrainingSpaceNameIsRequired');
        [space] = await tx
          .insert(s.spaces)
          .values({ ...input, name: input.name, branchId })
          .returning();
      }
      if (!space) throw new NotFoundException('Backend.trainingSpaceNotFound');
      await invalidatePublication(tx, clubId);
      await this.audit(tx, userId, clubId, 'space.saved', space.id);
      return space;
    });
  }
  async listPublic(
    filters: CatalogFilters,
    favoritesOf?: string,
    guestIds?: string[],
  ) {
    if (guestIds && !guestIds.length) return [];
    const needle = normalizeCatalogSearch(filters.search).replace(
      /[\\%_]/g,
      '\\$&',
    );
    const normalized = sql<string>`lower(regexp_replace(translate(concat_ws(' ',
      ${s.organizations.name}, ${s.clubs.shortDescription}, ${s.branchProfiles.address},
      ${s.branchProfiles.neighborhood}, ${s.cities.name}, ${s.districts.name}),
      'يىك٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹‌‍', 'ییک01234567890123456789  '), '\\s+', ' ', 'g'))`;
    const tariffConditions = sql`g.club_id = ${s.clubs.id} and g.is_active and (g.branch_id is null or g.branch_id = ${s.branchProfiles.branchId})
      and v.effective_from <= now() and not exists(select 1 from club_tariff_versions newer where newer.group_id = g.id and newer.version > v.version and newer.effective_from <= now())
      ${filters.serviceType ? sql`and v.service_type = ${filters.serviceType}` : sql``}
      ${filters.unit ? sql`and v.unit = ${filters.unit}` : sql``}
      ${filters.minPrice !== undefined ? sql`and v.price_toman >= ${filters.minPrice}` : sql``}
      ${filters.maxPrice !== undefined ? sql`and v.price_toman <= ${filters.maxPrice}` : sql``}`;
    const hasTariffFilter =
      filters.serviceType ||
      filters.unit ||
      filters.minPrice !== undefined ||
      filters.maxPrice !== undefined;
    const startingPrice = sql<
      number | null
    >`(select v.price_toman from club_tariff_groups g join club_tariff_versions v on v.group_id = g.id where ${tariffConditions} order by v.price_toman, g.id limit 1)`;
    // Choose one publicly complete branch matching every location/price condition.
    // Filtering and deduplication happen before pagination; cards link to this branch.
    const matched = this.database.db
      .select({
        branchId: s.branchProfiles.branchId,
        name: sql<string>`${s.branches.name}`.as('branch_name'),
        address: s.branchProfiles.address,
        countryId: s.branchProfiles.countryId,
        provinceId: s.branchProfiles.provinceId,
        cityId: s.branchProfiles.cityId,
        cityName: sql<string | null>`${s.cities.name}`.as('city_name'),
        districtId: s.branchProfiles.districtId,
        districtName: sql<string | null>`${s.districts.name}`.as(
          'district_name',
        ),
        latitude: s.branchProfiles.latitude,
        longitude: s.branchProfiles.longitude,
        startingPrice: startingPrice.as('starting_price'),
        startingTariff: sql<{
          priceToman: number;
          unit: string;
          serviceType: string;
        } | null>`(select jsonb_build_object('priceToman', v.price_toman, 'unit', v.unit, 'serviceType', v.service_type) from club_tariff_groups g join club_tariff_versions v on v.group_id = g.id where ${tariffConditions} order by v.price_toman, g.id limit 1)`.as(
          'starting_tariff',
        ),
      })
      .from(s.branchProfiles)
      .innerJoin(s.branches, eq(s.branches.id, s.branchProfiles.branchId))
      .leftJoin(s.cities, eq(s.cities.id, s.branchProfiles.cityId))
      .leftJoin(s.districts, eq(s.districts.id, s.branchProfiles.districtId))
      .where(
        and(
          eq(s.branchProfiles.clubId, s.clubs.id),
          publicBranchProfile(),
          isNull(s.branchProfiles.archivedAt),
          needle ? ilike(normalized, `%${needle}%`) : undefined,
          filters.countryId
            ? eq(s.branchProfiles.countryId, filters.countryId)
            : undefined,
          filters.provinceId
            ? eq(s.branchProfiles.provinceId, filters.provinceId)
            : undefined,
          filters.cityId
            ? eq(s.branchProfiles.cityId, filters.cityId)
            : undefined,
          filters.districtId
            ? eq(s.branchProfiles.districtId, filters.districtId)
            : undefined,
          hasTariffFilter
            ? sql`exists(select 1 from club_tariff_groups g join club_tariff_versions v on v.group_id = g.id where ${tariffConditions})`
            : undefined,
        ),
      )
      .orderBy(
        filters.sort === 'priceLow'
          ? sql`${startingPrice} asc nulls last`
          : filters.sort === 'priceHigh'
            ? sql`${startingPrice} desc nulls last`
            : desc(s.branchProfiles.isMain),
        desc(s.branchProfiles.isMain),
        s.branchProfiles.branchId,
      )
      .limit(1)
      .as('matched_branch');
    return this.database.db
      .select({
        id: s.clubs.id,
        name: s.organizations.name,
        slug: s.organizations.slug,
        shortDescription: s.clubs.shortDescription,
        operatingStatus: s.clubs.operatingStatus,
        startingTariff: matched.startingTariff,
        cover: {
          id: s.clubMedia.id,
          type: s.clubMedia.type,
          url: s.clubMedia.url,
          thumbnailUrl: s.clubMedia.thumbnailUrl,
          alt: s.clubMedia.alt,
          width: s.clubMedia.width,
          height: s.clubMedia.height,
          durationSeconds: s.clubMedia.durationSeconds,
        },
        categories: sql<
          { id: string; name: string }[]
        >`coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.name)
          from club_category_links l join club_categories c on c.id = l.category_id
          where l.club_id = ${s.clubs.id} and c.is_active), '[]'::jsonb)`,
        sports: sql<
          { id: string; name: string }[]
        >`coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.name)
          from club_sport_links l join sports c on c.id = l.sport_id
          where l.club_id = ${s.clubs.id} and c.is_active), '[]'::jsonb)`,
        mainBranch: {
          id: matched.branchId,
          name: matched.name,
          address: matched.address,
          countryId: matched.countryId,
          provinceId: matched.provinceId,
          cityId: matched.cityId,
          cityName: matched.cityName,
          districtId: matched.districtId,
          districtName: matched.districtName,
          latitude: matched.latitude,
          longitude: matched.longitude,
        },
        rating: {
          average: sql<
            number | null
          >`(select round(avg(r.rating), 2)::float from club_reviews r
            where r.branch_id = ${matched.branchId} and r.status = 'published')`,
          count: sql<number>`(select count(*)::int from club_reviews r
            where r.branch_id = ${matched.branchId} and r.status = 'published')`,
        },
      })
      .from(s.clubs)
      .innerJoin(s.organizations, eq(s.organizations.id, s.clubs.id))
      .innerJoinLateral(matched, sql`true`)
      .leftJoin(
        s.clubMedia,
        and(
          eq(s.clubMedia.id, s.clubs.coverId),
          eq(s.clubMedia.organizationId, s.clubs.id),
        ),
      )
      .where(
        and(
          publicClub(),
          guestIds ? inArray(s.clubs.id, guestIds) : undefined,
          favoritesOf
            ? sql`exists(select 1 from favorite_clubs f where f.club_id = ${s.clubs.id} and f.user_id = ${favoritesOf})`
            : undefined,
          filters.categoryId
            ? sql`exists (select 1 from club_category_links l join club_categories c on c.id = l.category_id
            where l.club_id = ${s.clubs.id} and l.category_id = ${filters.categoryId} and c.is_active)`
            : undefined,
          filters.sportId
            ? sql`exists (select 1 from club_sport_links l join sports c on c.id = l.sport_id
            where l.club_id = ${s.clubs.id} and l.sport_id = ${filters.sportId} and c.is_active)`
            : undefined,
        ),
      )
      .orderBy(
        filters.sort === 'priceLow'
          ? sql`${matched.startingPrice} asc nulls last`
          : filters.sort === 'priceHigh'
            ? sql`${matched.startingPrice} desc nulls last`
            : desc(s.clubs.createdAt),
        s.clubs.id,
      )
      .limit(25)
      .offset((filters.page - 1) * 25);
  }
  adminDetail(id: string) {
    return readClub(this.database.db, id);
  }
  adminReadiness(id: string) {
    return publicationReadiness(this.database.db, id);
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
    search = '',
  ) {
    const t = taxonomies[kind];
    return this.database.db
      .select()
      .from(t)
      .where(
        and(
          includeInactive ? undefined : eq(t.isActive, true),
          search
            ? ilike(t.name, `%${search.replace(/[\\%_]/g, '\\$&')}%`)
            : undefined,
        ),
      )
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
      if (!row) throw new NotFoundException('Backend.itemNotFound');
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
    page = 1,
  ) {
    if (kind === 'countries')
      return this.database.db
        .select()
        .from(s.countries)
        .orderBy(s.countries.name, s.countries.id)
        .limit(300)
        .offset((page - 1) * 300);
    if (!parentId)
      throw new BadRequestException('Backend.aParentIdentifierIsRequired');
    if (kind === 'provinces')
      return this.database.db
        .select()
        .from(s.provinces)
        .where(eq(s.provinces.countryId, parentId))
        .orderBy(s.provinces.name, s.provinces.id)
        .limit(1000)
        .offset((page - 1) * 1000);
    if (kind === 'cities')
      return this.database.db
        .select()
        .from(s.cities)
        .where(eq(s.cities.provinceId, parentId))
        .orderBy(s.cities.name, s.cities.id)
        .limit(1000)
        .offset((page - 1) * 1000);
    return this.database.db
      .select()
      .from(s.districts)
      .where(eq(s.districts.cityId, parentId))
      .orderBy(s.districts.name, s.districts.id)
      .limit(1000)
      .offset((page - 1) * 1000);
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
      let row: { id: string; name: string };
      if (input.kind === 'countries') {
        if (!input.code)
          throw new BadRequestException('Backend.aCountryCodeIsRequired');
        const [created] = await tx
          .insert(s.countries)
          .values({ name: input.name, code: input.code })
          .returning();
        row = created;
      } else {
        if (!input.parentId)
          throw new BadRequestException('Backend.aParentIdentifierIsRequired');
        if (input.kind === 'provinces')
          row = (
            await tx
              .insert(s.provinces)
              .values({ name: input.name, countryId: input.parentId })
              .returning()
          )[0];
        else if (input.kind === 'cities')
          row = (
            await tx
              .insert(s.cities)
              .values({ name: input.name, provinceId: input.parentId })
              .returning()
          )[0];
        else
          row = (
            await tx
              .insert(s.districts)
              .values({ name: input.name, cityId: input.parentId })
              .returning()
          )[0];
      }
      await tx.insert(s.auditEvents).values({
        actorId: p.user.id,
        action: 'location.created',
        targetId: row.id,
        details: { kind: input.kind },
      });
      return row;
    });
  }
  async updateGeography(
    p: Principal,
    kind: 'countries' | 'provinces' | 'cities' | 'districts',
    id: string,
    input: { name: string },
  ) {
    await this.admin.requireAdmin(p);
    const table = {
      countries: s.countries,
      provinces: s.provinces,
      cities: s.cities,
      districts: s.districts,
    }[kind];
    return this.write(async (tx) => {
      const [row] = await tx
        .update(table)
        .set(input)
        .where(eq(table.id, id))
        .returning();
      if (!row) throw new NotFoundException('Backend.locationNotFound');
      await tx.insert(s.auditEvents).values({
        actorId: p.user.id,
        action: 'location.updated',
        targetId: id,
        details: { kind },
      });
      return row;
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
