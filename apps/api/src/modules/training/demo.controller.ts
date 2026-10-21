import {
  Body,
  Get,
  NotFoundException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { ClientHeader, parse } from '../auth/auth.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { ConsentGuard } from '../profile/consent.guard';
import { AdminService } from '../admin/admin.service';
import { DatabaseService } from '../../database/database.service';
import type { Environment } from '../../config/environment';
import { rows, jsonDto } from '../commerce/commerce.service';
import { deliverSportsNotification } from '../commerce/notification-delivery';
const scenario = z
  .object({
    userId: z.uuid(),
    channel: z.enum(['sms', 'push']),
    outcome: z.enum(['success', 'failure', 'delay']),
  })
  .strict();
@DomainController('admin', 'demo')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class DemoController {
  constructor(
    private readonly database: DatabaseService,
    private readonly admin: AdminService,
    private readonly config: ConfigService<Environment, true>,
  ) {}
  private async access(req: AuthRequest) {
    await this.admin.requireAdmin(req.principal);
    if (!this.config.get('DEMO_MODE', { infer: true }))
      throw new NotFoundException();
  }
  @Get() async status(@Req() req: AuthRequest) {
    await this.access(req);
    await this.database.db.execute(
      sql`UPDATE demo_deliveries SET state='delivered' WHERE state='pending' AND due_at<=now()`,
    );
    return jsonDto({
      accounts: await rows(
        this.database.db,
        sql`SELECT a.user_id,u.display_name FROM gym4me_demo_accounts a JOIN users u ON u.id=a.user_id ORDER BY a.user_id`,
      ),
      modes: await rows(
        this.database.db,
        sql`SELECT * FROM demo_delivery_modes`,
      ),
      deliveries: await rows(
        this.database.db,
        sql`SELECT * FROM demo_deliveries ORDER BY created_at DESC LIMIT 30`,
      ),
      events: await rows(
        this.database.db,
        sql`SELECT name,count(*)::int AS count FROM product_events GROUP BY name ORDER BY name`,
      ),
      privateVideo: false,
    });
  }
  @Post('scenario') async scenario(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    await this.access(req);
    const input = parse(scenario, body);
    const [account] = await rows(
      this.database.db,
      sql`SELECT user_id FROM gym4me_demo_accounts WHERE user_id=${input.userId}`,
    );
    if (!account) throw new NotFoundException();
    await this.database.db.transaction(async (tx) => {
      await tx.execute(
        sql`INSERT INTO demo_delivery_modes(user_id,channel,outcome) VALUES(${input.userId},${input.channel},${input.outcome}) ON CONFLICT(user_id,channel) DO UPDATE SET outcome=EXCLUDED.outcome,updated_at=now()`,
      );
      if (input.channel === 'push') {
        const state =
          input.outcome === 'failure'
            ? 'failed'
            : input.outcome === 'delay'
              ? 'pending'
              : 'delivered';
        await tx.execute(
          sql`INSERT INTO demo_deliveries(user_id,channel,outcome,state,due_at) VALUES(${input.userId},'push',${input.outcome},${state},now()+${input.outcome === 'delay' ? 30 : 0}*interval '1 second')`,
        );
        await deliverSportsNotification(tx, {
          userId: input.userId,
          title: 'Training.demoPush',
          body: 'Training.demoPushHint',
          href: '/training',
          sourceKey: `demo-push:${randomUUID()}`,
        });
      }
    });
    return { success: true };
  }
}
