import { ConsentGuard } from '../profile/consent.guard';
import {
  Body,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { ApiQuery } from '@nestjs/swagger';
import { jsonDto } from '../commerce/commerce.service';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { ClientHeader } from '../auth/auth.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import * as c from './club.contracts';
import { ClubCommunityService } from './club.community.service';
const business = (req: AuthRequest) => {
  if (req.principal.session.client !== 'business')
    throw new ForbiddenException('Backend.signInFromTheBusinessPanel');
  return req.principal.user.id;
};
const coachProfileSchema = z
  .object({ biography: z.string().trim().max(5000).nullable().default(null) })
  .strict();
const replySchema = z
  .object({ reply: z.string().trim().min(2).max(2000) })
  .strict();
const moderationSchema = z
  .object({
    status: z.enum(['published', 'rejected']),
    reason: z.string().trim().min(5).max(1000),
    expectedStatus: z.enum(['pending', 'published', 'rejected']).optional(),
  })
  .strict();
@DomainController('profile', 'coach')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class CoachProfileController {
  constructor(private readonly service: ClubCommunityService) {}
  @Post() @c.SchemaBody(coachProfileSchema) profile(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    return this.service.coachProfile(
      req.principal,
      c.validate(coachProfileSchema, body).biography,
    );
  }
  @Get('affiliations')
  @ApiQuery({
    name: 'page',
    required: false,
    schema: { type: 'integer', minimum: 1, maximum: 100000, default: 1 },
    description:
      '100 affiliations per page, ordered by createdAt descending then id; a shorter page ends the list.',
  })
  affiliations(@Req() req: AuthRequest, @Query('page') page: unknown) {
    return this.service.affiliations(
      req.principal,
      c.validate(c.pageSchema, page),
    );
  }
  @Post('affiliations/:id/:action') respond(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('action') action: string,
  ) {
    return this.service.respondAffiliation(
      req.principal,
      c.validate(c.id, id),
      c.validate(z.enum(['accept', 'end']), action),
    );
  }
}
@DomainController('business', 'clubs')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class ClubTeamContentController {
  constructor(private readonly service: ClubCommunityService) {}
  @Post(':id/branches/:branchId/coaches')
  @c.SchemaBody(c.affiliationSchema)
  invite(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('branchId') branchId: string,
    @Body() body: unknown,
  ) {
    return this.service.inviteCoach(
      business(req),
      c.validate(c.id, id),
      c.validate(c.id, branchId),
      c.validate(c.affiliationSchema, body),
    );
  }
  @Post(':id/branches/:branchId/coaches/:affiliationId/end') end(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('branchId') branchId: string,
    @Param('affiliationId') affiliationId: string,
  ) {
    return this.service.endCoach(
      business(req),
      c.validate(c.id, id),
      c.validate(c.id, branchId),
      c.validate(c.id, affiliationId),
    );
  }
  @Post(':id/branches/:branchId/reviews/:reviewId/reply')
  @c.SchemaBody(replySchema)
  reply(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('branchId') branchId: string,
    @Param('reviewId') reviewId: string,
    @Body() body: unknown,
  ) {
    return this.service.reply(
      business(req),
      c.validate(c.id, id),
      c.validate(c.id, branchId),
      c.validate(c.id, reviewId),
      c.validate(replySchema, body).reply,
    );
  }
}
@DomainController('catalog', 'clubs')
export class ClubReviewsController {
  constructor(private readonly service: ClubCommunityService) {}
  @Get(':id/branches/:branchId/reviews') list(
    @Param('id') id: string,
    @Param('branchId') branchId: string,
    @Query('page') page: unknown,
  ) {
    return this.service.reviews(
      c.validate(c.id, id),
      c.validate(c.id, branchId),
      c.validate(c.pageSchema, page),
    );
  }
  @Post(':id/branches/:branchId/reviews/:reviewId/report')
  @ClientHeader()
  @UseGuards(ClientGuard, AuthGuard, ConsentGuard)
  report(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('branchId') branch: string,
    @Param('reviewId') review: string,
    @Body() body: unknown,
  ) {
    return this.service.reportReview(
      req.principal,
      c.validate(c.id, id),
      c.validate(c.id, branch),
      c.validate(c.id, review),
      c.validate(
        z.object({ reason: z.string().trim().min(5).max(1000) }).strict(),
        body,
      ).reason,
    );
  }
  @Post(':id/branches/:branchId/reviews')
  @ClientHeader()
  @UseGuards(ClientGuard, AuthGuard, ConsentGuard)
  @c.SchemaBody(c.reviewSchema)
  create(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('branchId') branchId: string,
    @Body() body: unknown,
  ) {
    return this.service.createReview(
      req.principal,
      c.validate(c.id, id),
      c.validate(c.id, branchId),
      c.validate(c.reviewSchema, body),
    );
  }
}
@DomainController('admin', 'reviews')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class AdminClubReviewsController {
  constructor(private readonly service: ClubCommunityService) {}
  @Get('reports') async reports(@Req() req: AuthRequest) {
    return jsonDto(await this.service.reviewReports(req.principal));
  }
  @Post('reports/:id/resolve') resolve(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.resolveReport(
      req.principal,
      c.validate(c.id, id),
      c.validate(
        z
          .object({
            reason: z.string().trim().min(5).max(1000),
            hidden: z.boolean(),
            revision: z.number().int().positive(),
          })
          .strict(),
        body,
      ),
    );
  }

  @Get() list(
    @Req() req: AuthRequest,
    @Query('page') page: unknown,
    @Query('status') status: unknown,
  ) {
    return this.service.moderationQueue(
      req.principal,
      c.validate(c.pageSchema, page),
      c.validate(
        z.enum(['pending', 'published', 'rejected']).default('pending'),
        status,
      ),
    );
  }
  @Post(':id/moderate') @c.SchemaBody(moderationSchema) moderate(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = c.validate(moderationSchema, body);
    return this.service.moderate(
      req.principal,
      c.validate(c.id, id),
      input.status,
      input.reason,
      input.expectedStatus,
    );
  }
}
