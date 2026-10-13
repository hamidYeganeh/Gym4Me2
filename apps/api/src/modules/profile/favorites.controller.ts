import { ConsentGuard } from './consent.guard';
import { Body, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { ClientHeader, parse } from '../auth/auth.contracts';
import { ClientGuard, AuthGuard, type AuthRequest } from '../auth/auth.guard';
import { SchemaBody } from '../clubs/club.contracts';
import { FavoritesService } from './favorites.service';
const mergeSchema = z
  .object({
    ids: z
      .array(z.uuid())
      .max(500)
      .transform((ids) => [...new Set(ids)]),
  })
  .strict();
const savedSchema = z.object({ saved: z.boolean() }).strict();
@DomainController('profile', 'favorites')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}
  @Get() list(@Req() req: AuthRequest) {
    return this.favorites.list(req.principal.user.id);
  }
  @Post('merge') @SchemaBody(mergeSchema) merge(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    return this.favorites.merge(
      req.principal.user.id,
      parse(mergeSchema, body).ids,
    );
  }
  @Post(':id') @SchemaBody(savedSchema) set(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.favorites.set(
      req.principal.user.id,
      parse(z.uuid(), id),
      parse(savedSchema, body).saved,
    );
  }
}
