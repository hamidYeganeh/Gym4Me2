import { Module } from '@nestjs/common';
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
