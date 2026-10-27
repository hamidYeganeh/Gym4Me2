import { FileInterceptor } from '@nestjs/platform-express';
import {
  Body,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { z } from 'zod';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { ClientHeader, JsonBody, parse } from '../auth/auth.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { ConsentGuard } from '../profile/consent.guard';
import { CommunityService } from './community.service';
import { SportsCalendarService } from './calendars.service';
import {
  calendarScopeSchema,
  calendarSettingsSchema,
} from './calendars.contracts';
import { SportsConversationService } from './conversations.service';
import {
  conversationPreferencesSchema,
  conversationStateSchema,
} from './conversations.contracts';
import {
  conversationPageSchema,
  hostConversationPageSchema,
  notificationPageSchema,
} from './community-page';
import { jsonDto } from './commerce.service';
import { commandKey } from './commerce.contracts';
import { ApiBody, ApiQuery } from '@nestjs/swagger';
import {
  conversationPreferencesBodySchema,
  calendarSettingsBodySchema,
  conversationStateBodySchema,
} from './commerce.openapi';
const id = (v: string) => parse(z.uuid(), v);
const dto = async (value: Promise<unknown>) => jsonDto(await value);
@DomainController('sports', 'community')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class SportsCommunityController {
  constructor(
    private readonly s: CommunityService,
    private readonly conversationsService: SportsConversationService,
    private readonly calendarsService: SportsCalendarService,
  ) {}
  @Get('host/calendar')
  @ApiQuery({ name: 'organizationId', required: true, type: String })
  @ApiQuery({ name: 'branchId', required: true, type: String })
  hostCalendar(@Req() r: AuthRequest, @Query() query: unknown) {
    return dto(
      this.calendarsService.host(
        r.principal.user.id,
        parse(calendarScopeSchema, query),
      ),
    );
  }
  @Post('host/calendar')
  @ApiQuery({ name: 'organizationId', required: true, type: String })
  @ApiQuery({ name: 'branchId', required: true, type: String })
  @ApiBody({ schema: calendarSettingsBodySchema })
  saveCalendar(
    @Req() r: AuthRequest,
    @Query() query: unknown,
    @Body() body: unknown,
  ) {
    return dto(
      this.calendarsService.save(
        r.principal.user.id,
        parse(calendarScopeSchema, query),
        parse(calendarSettingsSchema, body),
      ),
    );
  }
  @Get('conversations') conversations(
    @Req() r: AuthRequest,
    @Query('archived') archived?: string,
  ) {
    return dto(
      this.conversationsService.conversations(
        r.principal.user.id,
        archived === 'true',
      ),
    );
  }
  @Get('conversations/page')
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'archived', required: false, enum: ['true', 'false'] })
  conversationPage(@Req() r: AuthRequest, @Query() query: unknown) {
    return dto(
      this.conversationsService.conversationPage(
        r.principal.user.id,
        parse(conversationPageSchema, query),
      ),
    );
  }
  @Get('conversations/:id') messages(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Query('before') before?: string,
  ) {
    return dto(
      this.conversationsService.messages(
        r.principal.user.id,
        id(value),
        before ? parse(z.uuid(), before) : undefined,
      ),
    );
  }
  @Get('host/conversations/page')
  @ApiQuery({ name: 'organizationId', required: true, type: String })
  @ApiQuery({ name: 'branchId', required: true, type: String })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'archived', required: false, enum: ['true', 'false'] })
  hostConversations(@Req() r: AuthRequest, @Query() query: unknown) {
    return dto(
      this.conversationsService.hostPage(
        r.principal.user.id,
        parse(hostConversationPageSchema, query),
      ),
    );
  }
  @Get('host/conversations/:id')
  @ApiQuery({ name: 'before', required: false, type: String })
  hostConversation(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Query('before') before?: string,
  ) {
    return dto(
      this.conversationsService.messages(
        r.principal.user.id,
        id(value),
        before ? parse(z.uuid(), before) : undefined,
        true,
      ),
    );
  }
  @Post('conversations/:id/messages')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 2 },
    }),
  )
  @JsonBody({ body: { type: 'string' }, idempotencyKey: { type: 'string' } })
  send(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const input = parse(
      z
        .object({
          body: z.string().trim().max(5000),
          idempotencyKey: commandKey,
        })
        .strict()
        .refine((v) => Boolean(v.body || file)),
      body,
    );
    return dto(
      this.conversationsService.send(
        r.principal.user.id,
        id(value),
        input.body,
        input.idempotencyKey,
        file?.buffer,
      ),
    );
  }
  @Post('conversations/:id/preferences')
  @ApiBody({ schema: conversationPreferencesBodySchema })
  preferences(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    return this.conversationsService.preferences(
      r.principal.user.id,
      id(value),
      parse(conversationPreferencesSchema, body),
    );
  }
  @Post('conversations/:id/close')
  @ApiBody({ schema: conversationStateBodySchema })
  close(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    return this.conversationsService.moderate(
      r.principal.user.id,
      id(value),
      parse(conversationStateSchema, body),
    );
  }
  @Post('conversations/:id/report')
  @JsonBody({ messageId: { type: 'string' }, reason: { type: 'string' } })
  report(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    const v = parse(
      z
        .object({
          messageId: z.uuid(),
          reason: z.string().trim().min(3).max(1000),
        })
        .strict(),
      body,
    );
    return this.conversationsService.reportMessage(
      r.principal.user.id,
      id(value),
      v.messageId,
      v.reason,
    );
  }
  @Get('notifications') notifications(@Req() r: AuthRequest) {
    return dto(this.s.notifications(r.principal.user.id));
  }
  @Get('notifications/page')
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'view', required: false, enum: ['all', 'unread'] })
  notificationPage(@Req() r: AuthRequest, @Query() query: unknown) {
    return dto(
      this.s.notificationPage(
        r.principal.user.id,
        parse(notificationPageSchema, query),
      ),
    );
  }
  @Post('notifications/:id/read') read(
    @Req() r: AuthRequest,
    @Param('id') value: string,
  ) {
    return dto(this.s.readNotification(r.principal.user.id, id(value)));
  }
  @Get('preferences') settings(@Req() r: AuthRequest) {
    return this.s.notificationPreferences(r.principal.user.id);
  }
  @Post('preferences')
  @JsonBody({
    reminders: { type: 'boolean' },
    messages: { type: 'boolean' },
    invitations: { type: 'boolean' },
  })
  settingsSave(@Req() r: AuthRequest, @Body() body: unknown) {
    return this.s.notificationPreferences(
      r.principal.user.id,
      parse(
        z
          .object({
            reminders: z.boolean(),
            messages: z.boolean(),
            invitations: z.boolean(),
          })
          .strict(),
        body,
      ),
    );
  }
  @Get('support') support(@Req() r: AuthRequest) {
    return dto(this.s.support(r.principal.user.id));
  }
  @Post('support')
  @JsonBody({ title: { type: 'string' }, body: { type: 'string' } })
  supportCreate(@Req() r: AuthRequest, @Body() body: unknown) {
    const v = parse(
      z
        .object({
          title: z.string().trim().min(3).max(160),
          body: z.string().trim().min(3).max(5000),
          orderId: z.uuid().optional(),
        })
        .strict(),
      body,
    );
    return dto(
      this.s.createTicket(r.principal.user.id, v.title, v.body, v.orderId),
    );
  }
  @Get('support/:id') ticket(
    @Req() r: AuthRequest,
    @Param('id') value: string,
  ) {
    return dto(this.s.ticket(r.principal.user.id, id(value)));
  }
  @Post('support/:id/messages')
  @JsonBody({ body: { type: 'string' } })
  reply(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.s.reply(
        r.principal.user.id,
        id(value),
        parse(
          z.object({ body: z.string().trim().min(1).max(5000) }).strict(),
          body,
        ).body,
      ),
    );
  }
  @Post('host/conversations')
  @JsonBody({ occurrenceId: { type: 'string' } })
  start(@Req() r: AuthRequest, @Body() body: unknown) {
    return dto(
      this.conversationsService.start(
        r.principal.user.id,
        parse(z.object({ occurrenceId: z.uuid() }).strict(), body).occurrenceId,
      ),
    );
  }
}
