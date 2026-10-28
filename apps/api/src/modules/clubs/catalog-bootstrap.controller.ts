import { Post, Req, UseGuards } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { DatabaseService } from '../../database/database.service';
import * as s from '../../database/schema';
import { AdminService } from '../admin/admin.service';
import { ClientHeader } from '../auth/auth.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { ConsentGuard } from '../profile/consent.guard';
import { initialCatalog, initialProvinces } from './catalog-defaults';
import { taxonomies, type TaxonomyKind } from './club.repository';
@DomainController('admin', 'catalog-bootstrap')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class CatalogBootstrapController {
  constructor(
    private readonly database: DatabaseService,
    private readonly admin: AdminService,
  ) {}
  @Post() async initialize(@Req() req: AuthRequest) {
    await this.admin.requireAdmin(req.principal);
    return this.database.db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext('gym4me:catalog-bootstrap'))`,
      );
      let added = 0;
      for (const kind of Object.keys(initialCatalog) as TaxonomyKind[]) {
        const existing = await tx
          .select({ name: taxonomies[kind].name, slug: taxonomies[kind].slug })
          .from(taxonomies[kind]);
        const names = new Set(existing.map((row) => row.name.trim()));
        const slugs = new Set(existing.map((row) => row.slug));
        const entries = initialCatalog[kind]
          .filter(([slug, name]) => !slugs.has(slug) && !names.has(name))
          .map(([slug, name]) => ({ slug, name, isActive: true }));
        if (!entries.length) continue;
        added += (
          await tx
            .insert(taxonomies[kind])
            .values(entries)
            .onConflictDoNothing()
            .returning({ id: taxonomies[kind].id })
        ).length;
      }
      added += (
        await tx
          .insert(s.countries)
          .values({ name: 'ایران', code: 'IR' })
          .onConflictDoNothing()
          .returning()
      ).length;
      const [iran] = await tx
        .select()
        .from(s.countries)
        .where(eq(s.countries.code, 'IR'));
      added += (
        await tx
          .insert(s.provinces)
          .values(
            initialProvinces.map((name) => ({ name, countryId: iran!.id })),
          )
          .onConflictDoNothing()
          .returning()
      ).length;
      const [tehran] = await tx
        .select()
        .from(s.provinces)
        .where(
          and(
            eq(s.provinces.countryId, iran!.id),
            eq(s.provinces.name, 'تهران'),
          ),
        );
      added += (
        await tx
          .insert(s.cities)
          .values(
            ['تهران', 'اسلامشهر'].map((name) => ({
              name,
              provinceId: tehran!.id,
            })),
          )
          .onConflictDoNothing()
          .returning()
      ).length;
      await tx.insert(s.auditEvents).values({
        actorId: req.principal.user.id,
        action: 'catalog.initialized',
        details: { added: String(added) },
      });
      return { added };
    });
  }
}
