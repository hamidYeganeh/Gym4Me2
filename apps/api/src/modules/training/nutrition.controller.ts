import { Body, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { ClientHeader, parse } from '../auth/auth.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { ConsentGuard } from '../profile/consent.guard';
import { SchemaBody } from '../clubs/club.contracts';
import { coachingActor } from '../coaching/coaching.controller';
import { jsonDto } from '../commerce/commerce.service';
import { NutritionService } from './nutrition.service';
import * as c from './nutrition.contracts';
@DomainController('profile', 'nutrition')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class NutritionController {
  constructor(private readonly nutrition: NutritionService) {}
  @Get('foods') foods(@Query() query: unknown) {
    return this.nutrition.foods(parse(c.foodQuery, query));
  }
  @Post('foods/:id/entries') @SchemaBody(c.foodEntry) async addFood(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.nutrition.addFood(
      coachingActor(req),
      parse(z.string().regex(/^[0-9]{1,10}$/), id),
      parse(c.foodEntry, body),
    );
  }
  @Get() async day(@Req() req: AuthRequest, @Query() query: unknown) {
    return jsonDto(
      await this.nutrition.day(coachingActor(req), parse(c.day, query).date),
    );
  }
  @Post('entries') @SchemaBody(c.entry) async add(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    return jsonDto(
      await this.nutrition.add(coachingActor(req), parse(c.entry, body)),
    );
  }
  @Post('entries/:id/remove') @SchemaBody(c.remove) async remove(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return jsonDto(
      await this.nutrition.remove(
        coachingActor(req),
        parse(z.uuid(), id),
        parse(c.remove, body),
      ),
    );
  }
}
