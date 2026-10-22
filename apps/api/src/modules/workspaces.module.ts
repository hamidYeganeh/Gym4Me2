import { AdvancedBusinessService } from './advanced-business/ph5.service';
import {
  AdvancedBusinessController,
  CoachSettlementsController,
  AdminAdvancedController,
} from './advanced-business/ph5.controller';
import { PushJobsController } from './push/push-jobs.controller';
import { WebPushService } from './push/push.service';
import { WebPushSender } from './push/push.sender';
import { WebPushInterceptor } from './push/push.interceptor';
import {
  PushConfigurationController,
  WebPushController,
} from './push/push.controller';
import { DemoController } from './training/demo.controller';
import {
  AdminAnalyticsController,
  BusinessAnalyticsController,
  CoachAnalyticsController,
} from './analytics/analytics.controller';
import { AnalyticsService } from './analytics/analytics.service';
import {
  TrainingController,
  CollaborationController,
} from './training/training.controller';
import { TrainingService } from './training/training.service';
import { CollaborationService } from './training/collaboration.service';
import { CoachingPracticeService } from './coaching/practice.service';
import { CoachingRecordsService } from './coaching/records.service';
import {
  CoachingPracticeController,
  CoachingDirectoryController,
  BusinessCoachingController,
  AdminCoachingController,
} from './coaching/practice.controller';
import { SportsDocumentsController } from './commerce/documents.controller';
import { CoachingController } from './coaching/coaching.controller';
import { CoachingService } from './coaching/coaching.service';
import { SportsResourceController } from './commerce/resources.controller';
import { SportsResourceService } from './commerce/resources.service';
import { SportsInvitationService } from './commerce/invitations.service';
import { SportsDocumentService } from './commerce/documents.service';
import { SportsMediaService } from './commerce/media.service';
import {
  BusinessSportsMediaController,
  PublicSportsMediaController,
} from './commerce/media.controller';
import { SportsOperationsService } from './commerce/operations.service';
import {
  SportsOperationsController,
  AdminSportsController,
} from './commerce/operations.controller';
import { CommerceWorker } from './commerce/commerce.worker';
import { CommunityService } from './commerce/community.service';
import { SportsCalendarService } from './commerce/calendars.service';
import { SportsConversationService } from './commerce/conversations.service';
import {
  SportsCalendarsController,
  SportsCommunityController,
} from './commerce/community.controller';
import { CommerceService } from './commerce/commerce.service';
import {
  PAYMENT_ADAPTER,
  SamanMockPaymentAdapter,
} from './commerce/sandbox-payment';
import {
  SportsCatalogController,
  SportsAccountController,
  BusinessSportsController,
  SportsPaymentCallbacksController,
} from './commerce/commerce.controller';
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DemoJobsInterceptor } from './commerce/demo-jobs.interceptor';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from './auth/auth.module';
import {
  AdminAuditController,
  AdminOrganizationsController,
  AdminOverviewController,
  AdminUsersController,
} from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { BusinessController } from './business/business.controller';
import { BusinessService } from './business/business.service';
import {
  AccessController,
  InvitationsController,
  ProfileController,
} from './profile/profile.controller';
import { ClubService } from './clubs/club.service';
import {
  BusinessClubsController,
  PublicClubsController,
  PublicTaxonomiesController,
  AdminTaxonomiesController,
  PublicLocationsController,
  AdminLocationsController,
  AdminClubsController,
} from './clubs/club.controller';

import { ClubCommunityService } from './clubs/club.community.service';
import { StorageModule } from './clubs/storage.module';
import { MediaRetentionService } from './clubs/media-retention.service';
import { ClubMediaService } from './clubs/club.media.service';
import { ClubTariffService } from './clubs/club.tariffs';
import { BusinessTariffsController } from './clubs/club.tariffs.controller';
import { AccountPhoneController } from './profile/account-phone.controller';
import { FavoritesController } from './profile/favorites.controller';
import { FavoritesService } from './profile/favorites.service';
import { PrivacyService } from './profile/privacy.service';
import { RetentionService } from './profile/retention.service';
import { ConsentGuard } from './profile/consent.guard';
import {
  AccountPrivacyController,
  PrivacyPolicyController,
} from './profile/privacy.controller';
import {
  BusinessMediaController,
  PublicMediaController,
  AdminMediaController,
} from './clubs/club.media.controller';
import {
  CoachProfileController,
  ClubTeamContentController,
  ClubReviewsController,
  AdminClubReviewsController,
} from './clubs/club.community.controller';

@Module({
  imports: [DatabaseModule, AuthModule, StorageModule],
  controllers: [
    AdvancedBusinessController,
    CoachSettlementsController,
    AdminAdvancedController,
    PushJobsController,
    PushConfigurationController,
    WebPushController,
    AdminAnalyticsController,
    BusinessAnalyticsController,
    CoachAnalyticsController,
    TrainingController,
    CollaborationController,
    DemoController,
    CoachingController,
    CoachingPracticeController,
    CoachingDirectoryController,
    BusinessCoachingController,
    AdminCoachingController,
    SportsCatalogController,
    SportsAccountController,
    SportsPaymentCallbacksController,
    BusinessSportsController,
    SportsCalendarsController,
    SportsCommunityController,
    SportsOperationsController,
    AdminSportsController,
    SportsDocumentsController,
    SportsResourceController,
    BusinessSportsMediaController,
    PublicSportsMediaController,
    AccountPrivacyController,
    PrivacyPolicyController,
    FavoritesController,
    AccountPhoneController,
    BusinessTariffsController,
    BusinessMediaController,
    PublicMediaController,
    AdminMediaController,
    CoachProfileController,
    ClubTeamContentController,
    ClubReviewsController,
    AdminClubReviewsController,
    BusinessClubsController,
    PublicClubsController,
    PublicTaxonomiesController,
    AdminTaxonomiesController,
    PublicLocationsController,
    AdminLocationsController,
    AdminClubsController,
    ProfileController,
    AccessController,
    InvitationsController,
    BusinessController,
    AdminAuditController,
    AdminOrganizationsController,
    AdminOverviewController,
    AdminUsersController,
  ],
  providers: [
    AdvancedBusinessService,
    WebPushService,
    WebPushSender,
    { provide: APP_INTERCEPTOR, useClass: WebPushInterceptor },
    AnalyticsService,
    TrainingService,
    CollaborationService,
    CoachingService,
    CoachingPracticeService,
    CoachingRecordsService,
    { provide: APP_INTERCEPTOR, useClass: DemoJobsInterceptor },
    CommerceService,
    { provide: PAYMENT_ADAPTER, useClass: SamanMockPaymentAdapter },
    CommunityService,
    SportsCalendarService,
    SportsConversationService,
    CommerceWorker,
    SportsOperationsService,
    SportsDocumentService,
    SportsResourceService,
    SportsInvitationService,
    SportsMediaService,
    PrivacyService,
    RetentionService,
    ConsentGuard,
    BusinessService,
    AdminService,
    ClubService,
    ClubCommunityService,
    MediaRetentionService,
    ClubMediaService,
    ClubTariffService,
    FavoritesService,
  ],
})
export class WorkspacesModule {}
