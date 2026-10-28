import { CatalogBootstrapController } from './clubs/catalog-bootstrap.controller';
import {
  AdminDiscoveryContentController,
  PublicDiscoveryContentController,
} from './clubs/discovery-content.controller';
import { CoachSamplesService } from './coaching/samples.service';
import {
  CoachSamplesController,
  PublicCoachSamplesController,
} from './coaching/samples.controller';
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseModule } from '../database/database.module';
import {
  AdminAuditController,
  AdminOrganizationsController,
  AdminOverviewController,
  AdminUsersController,
} from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import {
  AdminAdvancedController,
  AdvancedBusinessController,
  CoachSettlementsController,
} from './advanced-business/ph5.controller';
import { AdvancedBusinessService } from './advanced-business/ph5.service';
import {
  AdminAnalyticsController,
  BusinessAnalyticsController,
  CoachAnalyticsController,
} from './analytics/analytics.controller';
import { AnalyticsService } from './analytics/analytics.service';
import { AuthModule } from './auth/auth.module';
import { BusinessController } from './business/business.controller';
import { BusinessService } from './business/business.service';
import {
  AdminClubsController,
  AdminLocationsController,
  AdminTaxonomiesController,
  BusinessClubsController,
  PublicClubsController,
  PublicLocationsController,
  PublicTaxonomiesController,
} from './clubs/club.controller';
import { ClubService } from './clubs/club.service';
import { CoachingController } from './coaching/coaching.controller';
import { CoachingService } from './coaching/coaching.service';
import {
  AdminCoachingController,
  BusinessCoachingController,
  CoachingDirectoryController,
  CoachingPracticeController,
} from './coaching/practice.controller';
import { CoachingPracticeService } from './coaching/practice.service';
import { CoachingRecordsService } from './coaching/records.service';
import { SportsCalendarService } from './commerce/calendars.service';
import {
  BusinessSportsController,
  SportsAccountController,
  SportsCatalogController,
  SportsPaymentCallbacksController,
} from './commerce/commerce.controller';
import { CommerceService } from './commerce/commerce.service';
import { CommerceWorker } from './commerce/commerce.worker';
import { SportsCommunityController } from './commerce/community.controller';
import { CommunityService } from './commerce/community.service';
import { SportsConversationService } from './commerce/conversations.service';
import { DemoJobsInterceptor } from './commerce/demo-jobs.interceptor';
import { SportsDocumentsController } from './commerce/documents.controller';
import { SportsDocumentService } from './commerce/documents.service';
import {
  CollectionsController,
  HouseholdController,
  TuitionController,
} from './commerce/household-billing.controller';
import { HouseholdBillingService } from './commerce/household-billing.service';
import { SportsInvitationService } from './commerce/invitations.service';
import { LegacyGroupReconciliationService } from './commerce/legacy-group-reconciliation.service';
import {
  BusinessSportsMediaController,
  PublicSportsMediaController,
} from './commerce/media.controller';
import { SportsMediaService } from './commerce/media.service';
import {
  AdminSportsController,
  SportsOperationsController,
} from './commerce/operations.controller';
import { SportsOperationsService } from './commerce/operations.service';
import { SportsResourceController } from './commerce/resources.controller';
import { SportsResourceService } from './commerce/resources.service';
import {
  ConfiguredPaymentAdapter,
  SamanSandboxPaymentAdapter,
} from './commerce/saman-sandbox';
import {
  PAYMENT_ADAPTER,
  SamanMockPaymentAdapter,
} from './commerce/sandbox-payment';
import {
  AthleteWorkflowsController,
  BusinessWorkflowsController,
  SportsFormatsController,
} from './commerce/workflows.controller';
import { SportsWorkflowsService } from './commerce/workflows.service';
import { CrmService } from './growth/crm.service';
import { GrowthDiscoveryService } from './growth/discovery.service';
import {
  CrmController,
  GrowthOffersController,
  GrowthRecommendationsController,
} from './growth/growth.controller';
import { ProductNavigationController } from './profile/navigation.controller';
import {
  AccessController,
  InvitationsController,
  ProfileController,
} from './profile/profile.controller';
import { NativePushController } from './push/native-push.controller';
import { NativePushSender } from './push/native-push.sender';
import { NativePushService } from './push/native-push.service';
import { PushJobsController } from './push/push-jobs.controller';
import {
  PushConfigurationController,
  WebPushController,
} from './push/push.controller';
import { WebPushInterceptor } from './push/push.interceptor';
import { WebPushSender } from './push/push.sender';
import { WebPushService } from './push/push.service';
import {
  ReviewReactionsController,
  ReviewReactionsService,
} from './reviews/reactions';
import { CollaborationService } from './training/collaboration.service';
import { DemoController } from './training/demo.controller';
import {
  LegacyProgramsController,
  ProductEventsController,
} from './training/legacy-programs.controller';
import { TrainingService } from './training/training.service';

import {
  AdminClubReviewsController,
  ClubReviewsController,
  ClubTeamContentController,
  CoachProfileController,
} from './clubs/club.community.controller';
import { ClubCommunityService } from './clubs/club.community.service';
import {
  AdminMediaController,
  BusinessMediaController,
  PublicMediaController,
} from './clubs/club.media.controller';
import { ClubMediaService } from './clubs/club.media.service';
import { ClubTariffService } from './clubs/club.tariffs';
import { BusinessTariffsController } from './clubs/club.tariffs.controller';
import { MediaRetentionService } from './clubs/media-retention.service';
import { StorageModule } from './clubs/storage.module';
import { AccountPhoneController } from './profile/account-phone.controller';
import { ConsentGuard } from './profile/consent.guard';
import { DeletionJournalService } from './profile/deletion-journal.service';
import { FavoritesController } from './profile/favorites.controller';
import { FavoritesService } from './profile/favorites.service';
import {
  AccountPrivacyController,
  PrivacyPolicyController,
} from './profile/privacy.controller';
import { PrivacyService } from './profile/privacy.service';
import { RetentionService } from './profile/retention.service';

@Module({
  imports: [DatabaseModule, AuthModule, StorageModule],
  controllers: [
    CatalogBootstrapController,
    AdminDiscoveryContentController,
    PublicDiscoveryContentController,
    ReviewReactionsController,
    DemoController,
    ProductNavigationController,
    LegacyProgramsController,
    ProductEventsController,
    HouseholdController,
    TuitionController,
    CollectionsController,
    SportsFormatsController,
    AthleteWorkflowsController,
    BusinessWorkflowsController,
    NativePushController,
    CrmController,
    GrowthRecommendationsController,
    GrowthOffersController,
    AdvancedBusinessController,
    CoachSettlementsController,
    AdminAdvancedController,
    PushJobsController,
    PushConfigurationController,
    WebPushController,
    AdminAnalyticsController,
    BusinessAnalyticsController,
    CoachAnalyticsController,
    CoachingController,
    CoachingPracticeController,
    CoachingDirectoryController,
    CoachSamplesController,
    PublicCoachSamplesController,
    BusinessCoachingController,
    AdminCoachingController,
    SportsCatalogController,
    SportsAccountController,
    SportsPaymentCallbacksController,
    BusinessSportsController,
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
    ReviewReactionsService,
    HouseholdBillingService,
    SportsWorkflowsService,
    NativePushService,
    NativePushSender,
    CrmService,
    LegacyGroupReconciliationService,
    GrowthDiscoveryService,
    AdvancedBusinessService,
    WebPushService,
    WebPushSender,
    { provide: APP_INTERCEPTOR, useClass: WebPushInterceptor },
    AnalyticsService,
    TrainingService,
    CollaborationService,
    CoachingService,
    CoachingPracticeService,
    CoachSamplesService,
    CoachingRecordsService,
    { provide: APP_INTERCEPTOR, useClass: DemoJobsInterceptor },
    CommerceService,
    SamanMockPaymentAdapter,
    SamanSandboxPaymentAdapter,
    { provide: PAYMENT_ADAPTER, useClass: ConfiguredPaymentAdapter },
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
    DeletionJournalService,
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
