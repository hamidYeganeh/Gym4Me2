import {
  Body,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiQuery, type SchemaObject } from '@nestjs/swagger';
import { z } from 'zod';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { ClientHeader, parse } from '../auth/auth.contracts';
import { ConsentGuard } from '../profile/consent.guard';
import { jsonDto } from './commerce.service';
import { SportsResourceService } from './resources.service';
import {
  resourceSettingsSchema,
  resourceBlockSchema,
  resourceBlockCancelSchema,
  resourceCalendarSchema,
} from './resources.contracts';
const id = (value: string) => parse(z.uuid(), value);
const bodySchema = (schema: z.ZodType) =>
  z.toJSONSchema(schema, { target: 'openapi-3.0' }) as SchemaObject;
@DomainController('business', 'sports-resources')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class SportsResourceController {
  constructor(private readonly service: SportsResourceService) {}
  private user(req: AuthRequest) {
    if (req.principal.session.client !== 'business')
      throw new ForbiddenException();
    return req.principal.user.id;
  }
  @Post(':id/settings')
  @ApiBody({ schema: bodySchema(resourceSettingsSchema) })
  async settings(
    @Req() req: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    return this.service.settings(
      this.user(req),
      id(value),
      parse(resourceSettingsSchema, body),
    );
  }
  @Post(':id/blocks')
  @ApiBody({ schema: bodySchema(resourceBlockSchema) })
  async block(
    @Req() req: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    return this.service.createBlock(
      this.user(req),
      id(value),
      parse(resourceBlockSchema, body),
    );
  }
  @Post(':id/blocks/:blockId/cancel')
  @ApiBody({ schema: bodySchema(resourceBlockCancelSchema) })
  async cancel(
    @Req() req: AuthRequest,
    @Param('id') value: string,
    @Param('blockId') block: string,
    @Body() body: unknown,
  ) {
    return this.service.cancelBlock(
      this.user(req),
      id(value),
      id(block),
      parse(resourceBlockCancelSchema, body),
    );
  }
  @Get(':id/calendar')
  @ApiQuery({ name: 'from', required: true, type: String })
  @ApiQuery({ name: 'to', required: true, type: String })
  async calendar(
    @Req() req: AuthRequest,
    @Param('id') value: string,
    @Query() query: unknown,
  ) {
    return jsonDto(
      await this.service.calendar(
        this.user(req),
        id(value),
        parse(resourceCalendarSchema, query),
      ),
    );
  }
}
