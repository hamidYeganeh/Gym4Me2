import {
  Body,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { ClientHeader, parse } from '../auth/auth.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { SchemaBody } from '../clubs/club.contracts';
import { coachingActor } from '../coaching/coaching.controller';
import { rows, jsonDto } from '../commerce/commerce.service';
import { ConsentGuard } from '../profile/consent.guard';
import * as c from './training.contracts';
import { TrainingService } from './training.service';

/** Compatibility for previously assigned/paid programs; no personal workout workspace. */
@DomainController('profile', 'program-history')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class LegacyProgramsController {
  constructor(
    private readonly database: DatabaseService,
    private readonly training: TrainingService,
  ) {}

  @Get() async list(@Req() request: AuthRequest) {
    return jsonDto(
      await rows(
        this.database.db,
        sql`SELECT a.id,v.content->>'title' title,v.version,v.effective_from FROM training_assignments a JOIN training_versions v ON v.id=a.version_id WHERE a.athlete_id=${coachingActor(request)} ORDER BY a.created_at DESC,a.id DESC LIMIT 100`,
      ),
    );
  }

  @Get(':id') async detail(
    @Req() request: AuthRequest,
    @Param('id') value: string,
  ) {
    const actor = coachingActor(request),
      id = parse(z.uuid(), value);
    const [assignment] = await rows<{
      plan_id: string;
      content: c.PlanContent;
      version: number;
    }>(
      this.database.db,
      sql`SELECT v.plan_id,v.content,v.version FROM training_assignments a JOIN training_versions v ON v.id=a.version_id JOIN training_plans p ON p.id=v.plan_id WHERE a.id=${id} AND (a.athlete_id=${actor} OR p.owner_id=${actor})`,
    );
    if (!assignment) throw new NotFoundException('Training.notFound');
    await this.training.plan(actor, assignment.plan_id);
    return jsonDto({
      content: assignment.content,
      version: assignment.version,
      exercises: await this.training.library(),
    });
  }

  private async paidRequest(actor: string, value: string) {
    const [request] = await rows<{ relationship_id: string }>(
      this.database.db,
      sql`SELECT p.relationship_id FROM sport_program_requests p JOIN sport_orders o ON o.id=p.order_id WHERE p.id=${parse(z.uuid(), value)} AND p.coach_id=${actor} AND o.status IN ('paid','partially_refunded') AND p.status IN ('queued','preparing','revision_requested')`,
    );
    if (!request) throw new NotFoundException('Training.notFound');
    return request;
  }

  @Post('requests/:requestId/plans')
  @SchemaBody(c.savePlan)
  async save(
    @Req() request: AuthRequest,
    @Param('requestId') requestId: string,
    @Body() body: unknown,
  ) {
    const actor = coachingActor(request),
      contract = await this.paidRequest(actor, requestId),
      input = parse(c.savePlan, body);
    if (input.relationshipId !== contract.relationship_id || input.isTemplate)
      throw new NotFoundException('Training.notFound');
    return jsonDto(await this.training.save(actor, input, requestId));
  }

  @Post('requests/:requestId/plans/:planId/publish')
  @SchemaBody(c.publishPlan)
  async publish(
    @Req() request: AuthRequest,
    @Param('requestId') requestId: string,
    @Param('planId') value: string,
    @Body() body: unknown,
  ) {
    const actor = coachingActor(request),
      contract = await this.paidRequest(actor, requestId),
      planId = parse(z.uuid(), value);
    const [plan] = await rows(
      this.database.db,
      sql`SELECT id FROM training_plans WHERE id=${planId} AND owner_id=${actor} AND relationship_id=${contract.relationship_id} AND NOT is_template`,
    );
    if (!plan) throw new NotFoundException('Training.notFound');
    return jsonDto(
      await this.training.publish(
        actor,
        planId,
        parse(c.publishPlan, body),
        requestId,
      ),
    );
  }
}

@DomainController('profile', 'events')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class ProductEventsController {
  constructor(private readonly training: TrainingService) {}
  @Post() @SchemaBody(c.event) event(
    @Req() request: AuthRequest,
    @Body() body: unknown,
  ) {
    return this.training.event(coachingActor(request), parse(c.event, body));
  }
}
