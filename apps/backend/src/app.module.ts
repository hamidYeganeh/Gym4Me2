import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import {
  ClubMediaController,
  ClubObjectStorage,
} from './clubs/club-media.controller';
import { ClubPublicationController } from './clubs/publication.controller';
import { ResourcesController } from './resources/resources.controller';
import { DashboardGeographyController } from './dashboard/geography.controller';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Auth } from './onboarding/auth';
import { AuthController } from './onboarding/auth.controller';
import { ClubOnboardingController } from './onboarding/clubs.controller';
import { CoachRequestsController } from './onboarding/coach-requests.controller';
import { ScheduleController } from './schedule/schedule.controller';
import { Database } from './onboarding/database';

@Module({
  imports: [JwtModule.register({})],
  controllers: [
    AppController,
    DashboardGeographyController,
    ScheduleController,
    AuthController,
    ClubOnboardingController,
    CoachRequestsController,
    ClubPublicationController,
    ResourcesController,
    ClubMediaController,
  ],
  providers: [AppService, Auth, Database, ClubObjectStorage],
})
export class AppModule {}
