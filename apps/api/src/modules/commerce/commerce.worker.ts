import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../config/environment';
import { CommerceService } from './commerce.service';
@Injectable()
export class CommerceWorker implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;
  private readonly logger = new Logger(CommerceWorker.name);
  constructor(
    private readonly service: CommerceService,
    private readonly config: ConfigService<Environment, true>,
  ) {}
  onModuleInit() {
    if (
      this.config.get('NODE_ENV', { infer: true }) === 'test' ||
      this.config.get('DEMO_MODE', { infer: true }) === true
    )
      return;
    this.timer = setInterval(() => {
      void this.tick();
    }, 5000);
    this.timer.unref();
  }
  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.service.runJobs();
    } catch {
      this.logger.error('Sports worker failed; durable jobs will be retried');
    } finally {
      this.running = false;
    }
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
