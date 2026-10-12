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
import {
  CoachProfileController,
  ClubTeamContentController,
  ClubReviewsController,
  AdminClubReviewsController,
} from './clubs/club.community.controller';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [
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
  providers: [BusinessService, AdminService, ClubService, ClubCommunityService],
})
export class WorkspacesModule {}
