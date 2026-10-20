import { Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { DemoStorageService } from './demo-storage.service';

@DomainController('demo', 'media')
export class DemoMediaController {
  constructor(private readonly storage: DemoStorageService) {}
  @Get()
  async get(
    @Query('key') key = '',
    @Query('expires') expires = '',
    @Query('proof') proof = '',
    @Res() response: Response,
  ) {
    const file = await this.storage.signedGet(key, expires, proof);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    // Preview URLs never execute uploaded HTML/SVG or inline scripts.
    response.type(file.contentType).send(file.body);
  }
}
