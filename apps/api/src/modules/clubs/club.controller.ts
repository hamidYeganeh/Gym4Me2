import { ConsentGuard } from '../profile/consent.guard';
import {
  Body,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { ClientHeader } from '../auth/auth.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { AdminService } from '../admin/admin.service';
import { ClubService } from './club.service';
import * as c from './club.contracts';
const business = (req: AuthRequest) => {
  if (req.principal.session.client !== 'business')
    throw new ForbiddenException('Backend.signInFromTheBusinessPanel');
  return req.principal.user.id;
};
@DomainController('business', 'clubs')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class BusinessClubsController {
  constructor(private readonly service: ClubService) {}
  @Post() @c.SchemaBody(c.clubCreateSchema) create(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    return this.service.create(
      business(req),
      c.validate(c.clubCreateSchema, body),
    );
  }
  @Get(':id') detail(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.own(business(req), c.validate(c.id, id));
  }
  @Patch(':id') @c.SchemaBody(c.clubPatchSchema) update(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.update(
      business(req),
      c.validate(c.id, id),
      c.validate(c.clubPatchSchema, body),
    );
  }
  @Get(':id/readiness') readiness(
    @Req() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.service.readiness(business(req), c.validate(c.id, id));
  }
  @Post(':id/publication/:action') publication(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('action') action: string,
  ) {
    return this.service.publication(
      business(req),
      c.validate(c.id, id),
      c.validate(z.enum(['submit', 'publish', 'hide', 'archive']), action),
    );
  }
  @Post(':id/media') @c.SchemaBody(c.mediaSchema) media(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.media(
      business(req),
      c.validate(c.id, id),
      c.validate(c.mediaSchema, body),
    );
  }
  @Post(':id/branches') @c.SchemaBody(c.branchCreateSchema) createBranch(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.createBranch(
      business(req),
      c.validate(c.id, id),
      c.validate(c.branchCreateSchema, body),
    );
  }
  @Get(':id/branches/:branchId') branch(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('branchId') branchId: string,
  ) {
    return this.service.branch(
      business(req),
      c.validate(c.id, id),
      c.validate(c.id, branchId),
    );
  }
  @Patch(':id/branches/:branchId')
  @c.SchemaBody(c.branchPatchSchema)
  updateBranch(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('branchId') branchId: string,
    @Body() body: unknown,
  ) {
    return this.service.updateBranch(
      business(req),
      c.validate(c.id, id),
      c.validate(c.id, branchId),
      c.validate(c.branchPatchSchema, body),
    );
  }
  @Post(':id/branches/:branchId/spaces')
  @c.SchemaBody(c.spaceSchema)
  createSpace(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('branchId') branchId: string,
    @Body() body: unknown,
  ) {
    return this.service.saveSpace(
      business(req),
      c.validate(c.id, id),
      c.validate(c.id, branchId),
      c.validate(c.spaceSchema, body),
    );
  }
  @Patch(':id/branches/:branchId/spaces/:spaceId')
  @c.SchemaBody(c.spacePatchSchema)
  updateSpace(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('branchId') branchId: string,
    @Param('spaceId') spaceId: string,
    @Body() body: unknown,
  ) {
    return this.service.saveSpace(
      business(req),
      c.validate(c.id, id),
      c.validate(c.id, branchId),
      c.validate(c.spacePatchSchema, body),
      c.validate(c.id, spaceId),
    );
  }
}
@DomainController('catalog', 'clubs')
export class PublicClubsController {
  constructor(private readonly service: ClubService) {}
  // Read-only lookup: local guest IDs stay in the body, not URL/history logs.
  @Post('guest-saved') @c.SchemaBody(c.guestSavedSchema) guestSaved(
    @Body() body: unknown,
  ) {
    const input = c.validate(c.guestSavedSchema, body);
    return this.service.listPublic(input.filters, undefined, input.ids);
  }
  @Get() list(@Query() query: unknown) {
    return this.service.listPublic(c.validate(c.catalogFiltersSchema, query));
  }
  @Get('saved')
  @ClientHeader()
  @UseGuards(ClientGuard, AuthGuard, ConsentGuard)
  saved(@Query() query: unknown, @Req() req: AuthRequest) {
    return this.service.listPublic(
      c.validate(c.catalogFiltersSchema, query),
      req.principal.user.id,
    );
  }
  @Get(':id') detail(@Param('id') id: string) {
    return this.service.publicDetail(c.validate(c.id, id));
  }
  @Get(':id/branches/:branchId') branch(
    @Param('id') id: string,
    @Param('branchId') branchId: string,
  ) {
    return this.service.publicBranch(
      c.validate(c.id, id),
      c.validate(c.id, branchId),
    );
  }
}
@DomainController('catalog', 'taxonomies')
export class PublicTaxonomiesController {
  constructor(private readonly service: ClubService) {}
  @Get(':kind') list(
    @Param('kind') kind: string,
    @Query('page') page: unknown,
    @Query('search') search: unknown,
    @Query('limit') limit: unknown,
    @Query('id') selectedId: unknown,
  ) {
    return this.service.listTaxonomy(
      c.validate(c.taxonomyKindSchema, kind),
      c.validate(c.pageSchema, page),
      false,
      c.validate(c.optionSearchSchema, search),
      c.validate(c.optionLimitSchema(100), limit),
      c.validate(c.id.optional(), selectedId),
    );
  }
}
@DomainController('admin', 'taxonomies')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class AdminTaxonomiesController {
  constructor(
    private readonly service: ClubService,
    private readonly admin: AdminService,
  ) {}
  @Get(':kind') async list(
    @Req() req: AuthRequest,
    @Param('kind') kind: string,
    @Query('page') page: unknown,
    @Query('search') search: unknown,
    @Query('limit') limit: unknown,
    @Query('id') selectedId: unknown,
  ) {
    await this.admin.requireAdmin(req.principal);
    return this.service.listTaxonomy(
      c.validate(c.taxonomyKindSchema, kind),
      c.validate(c.pageSchema, page),
      true,
      c.validate(c.optionSearchSchema, search),
      c.validate(c.optionLimitSchema(100), limit),
      c.validate(c.id.optional(), selectedId),
    );
  }
  @Post(':kind') @c.SchemaBody(c.taxonomyCreateSchema) create(
    @Req() req: AuthRequest,
    @Param('kind') kind: string,
    @Body() body: unknown,
  ) {
    return this.service.saveTaxonomy(
      req.principal,
      c.validate(c.taxonomyKindSchema, kind),
      c.validate(c.taxonomyCreateSchema, body),
    );
  }
  @Patch(':kind/:id') @c.SchemaBody(c.taxonomyPatchSchema) update(
    @Req() req: AuthRequest,
    @Param('kind') kind: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.saveTaxonomy(
      req.principal,
      c.validate(c.taxonomyKindSchema, kind),
      c.validate(c.taxonomyPatchSchema, body),
      c.validate(c.id, id),
    );
  }
}
@DomainController('catalog', 'locations')
export class PublicLocationsController {
  constructor(private readonly service: ClubService) {}
  @Get('discovery') @c.DiscoveryLocationQuery() discovery(
    @Query() query: unknown,
  ) {
    return this.service.discoverLocations(
      c.validate(c.locationDiscoverySchema, query),
    );
  }
  @Get(':kind') @c.LocationQuery() list(
    @Param('kind') kind: string,
    @Query('parentId') parentId: unknown,
    @Query('page') page: unknown,
    @Query('search') search: unknown,
    @Query('limit') limit: unknown,
    @Query('id') selectedId: unknown,
  ) {
    return this.service.publicGeography(
      c.validate(c.geographyKindSchema, kind),
      c.validate(c.id.optional(), parentId),
      c.validate(c.pageSchema, page),
      c.validate(c.optionSearchSchema, search),
      c.validate(c.optionLimitSchema(), limit),
      c.validate(c.id.optional(), selectedId),
    );
  }
}
@DomainController('admin', 'locations')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class AdminLocationsController {
  constructor(
    private readonly service: ClubService,
    private readonly admin: AdminService,
  ) {}
  @Get(':kind') @c.LocationQuery() async list(
    @Req() req: AuthRequest,
    @Param('kind') kind: string,
    @Query('parentId') parentId: unknown,
    @Query('page') page: unknown,
    @Query('search') search: unknown,
    @Query('limit') limit: unknown,
    @Query('id') selectedId: unknown,
  ) {
    await this.admin.requireAdmin(req.principal);
    return this.service.geography(
      c.validate(c.geographyKindSchema, kind),
      c.validate(c.id.optional(), parentId),
      c.validate(c.pageSchema, page),
      c.validate(c.optionSearchSchema, search),
      c.validate(c.optionLimitSchema(), limit),
      c.validate(c.id.optional(), selectedId),
    );
  }
  @Patch(':kind/:id') @c.SchemaBody(c.geographyPatchSchema) update(
    @Req() req: AuthRequest,
    @Param('kind') kind: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.updateGeography(
      req.principal,
      c.validate(c.geographyKindSchema, kind),
      c.validate(c.id, id),
      c.validate(c.geographyPatchSchema, body),
    );
  }
  @Post() @c.SchemaBody(c.geographySchema) create(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    return this.service.createGeography(
      req.principal,
      c.validate(c.geographySchema, body),
    );
  }
}
@DomainController('admin', 'clubs')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class AdminClubsController {
  constructor(
    private readonly service: ClubService,
    private readonly admin: AdminService,
  ) {}
  @Get(':id') async detail(@Req() req: AuthRequest, @Param('id') id: string) {
    await this.admin.requireAdmin(req.principal);
    return this.service.adminDetail(c.validate(c.id, id));
  }
  @Get(':id/readiness') async readiness(
    @Req() req: AuthRequest,
    @Param('id') id: string,
  ) {
    await this.admin.requireAdmin(req.principal);
    return this.service.adminReadiness(c.validate(c.id, id));
  }
  @Get(':id/branches/:branchId') async branch(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('branchId') branchId: string,
  ) {
    await this.admin.requireAdmin(req.principal);
    return this.service.adminBranch(
      c.validate(c.id, id),
      c.validate(c.id, branchId),
    );
  }
  @Post(':id/review') @c.SchemaBody(c.decisionSchema) review(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const data = c.validate(c.decisionSchema, body);
    return this.admin.review(
      req.principal,
      c.validate(c.id, id),
      data.status,
      data.reason,
    );
  }
}
