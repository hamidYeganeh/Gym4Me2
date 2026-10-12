import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { Environment } from '../config/environment';
import * as schema from './schema';

@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool;
  readonly db: NodePgDatabase<typeof schema>;

  constructor(config: ConfigService<Environment, true>) {
    this.pool = new Pool({
      connectionString: config.get('DATABASE_URL', { infer: true }),
      max: config.get('DB_POOL_MAX', { infer: true }),
      connectionTimeoutMillis: config.get('DB_CONNECTION_TIMEOUT_MS', {
        infer: true,
      }),
      statement_timeout: config.get('DB_STATEMENT_TIMEOUT_MS', { infer: true }),
      idleTimeoutMillis: 30000,
      application_name: 'gym4me-api',
    });
    this.pool.on('error', () => {
      this.logger.error('An idle PostgreSQL connection failed');
    });
    this.db = drizzle(this.pool, { schema });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.pool.query('SELECT 1');
    } catch {
      await this.pool.end();
      throw new Error(
        'PostgreSQL connection failed. Check DATABASE_URL and database availability.',
      );
    }
  }

  async checkReadiness(): Promise<void> {
    // Checks connectivity, migration presence and access without reading user data.
    await this.pool.query(
      `SELECT users.status, organizations.status FROM users, organizations, branches,
       otp_challenges, auth_rate_limits, auth_sessions, organization_members,
       organization_invitations, platform_admins, audit_events LIMIT 0`,
    );
    await this.pool.query(
      `SELECT clubs.publication_status FROM clubs, branch_profiles, club_categories,
       branch_weekly_hours, club_reviews LIMIT 0`,
    );
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
