import { NativePushService } from '../push/native-push.service';
import { AdvancedBusinessService } from '../advanced-business/ph5.service';
import { GamesService } from '../growth/games.service';
import { Optional } from '@nestjs/common';
import { WebPushService } from '../push/push.service';
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
    private readonly push: WebPushService,
    @Optional() private readonly advanced?: AdvancedBusinessService,
    @Optional() private readonly games?: GamesService,
    @Optional() private readonly nativePush?: NativePushService,
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
      await this.advanced?.reconcileDue();
      await this.games?.runDue();
      await this.push.drain();
      await this.nativePush?.drain();
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
