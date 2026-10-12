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
  constructor(private readonly database: DatabaseService) {}

  @Get()
  @ApiOperation({ summary: 'API liveness; does not depend on PostgreSQL' })
  @ApiOkResponse({ description: 'The API process is running' })
  live() {
    return { status: 'ok', service: 'gym4me-api' };
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness, including PostgreSQL and initial schema',
  })
  @ApiOkResponse({
    description: 'PostgreSQL and the migrated schema are available',
  })
  @ApiServiceUnavailableResponse({
    description: 'The database or schema is unavailable',
  })
  async ready() {
    try {
      await this.database.checkReadiness();
      return {
        status: 'ok',
        service: 'gym4me-api',
        checks: { database: 'up' },
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'gym4me-api',
        checks: { database: 'down' },
      });
    }
  }
}
