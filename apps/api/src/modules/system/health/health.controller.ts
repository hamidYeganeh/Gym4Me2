import { StorageService } from '../../clubs/storage.service';
import { Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import { DatabaseService } from '../../../database/database.service';
import { DomainController } from '../../../platform/http/domain-controller.decorator';

@DomainController('system', 'health')
export class HealthController {
  constructor(
    private readonly database: DatabaseService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'API liveness; does not depend on PostgreSQL' })
  @ApiOkResponse({ description: 'The API process is running' })
  live() {
    return { status: 'ok', service: 'gym4me-api' };
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness, including PostgreSQL, migrated schema and S3',
  })
  @ApiOkResponse({
    description: 'PostgreSQL, migrated schema and S3 are available',
  })
  @ApiServiceUnavailableResponse({
    description: 'A required dependency is unavailable',
  })
  async ready() {
    const [database, storage] = await Promise.allSettled([
      this.database.checkReadiness(),
      this.storage.health(),
    ]);
    const checks = {
      database: database.status === 'fulfilled' ? 'up' : 'down',
      storage: storage.status === 'fulfilled' ? 'up' : 'down',
    };
    if (database.status === 'rejected' || storage.status === 'rejected')
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'gym4me-api',
        checks,
      });
    return { status: 'ok', service: 'gym4me-api', checks };
  }
}
