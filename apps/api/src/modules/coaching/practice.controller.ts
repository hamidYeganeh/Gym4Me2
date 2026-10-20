import {
  Body,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { z } from 'zod';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { ClientHeader, parse } from '../auth/auth.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { ConsentGuard } from '../profile/consent.guard';
import { AdminService } from '../admin/admin.service';
import { jsonDto, CommerceService } from '../commerce/commerce.service';
import { occurrenceSchema } from '../commerce/commerce.contracts';
import { SportsOperationsService } from '../commerce/operations.service';
import { SchemaBody } from '../clubs/club.contracts';
import { CoachingPracticeService } from './practice.service';
import { CoachingRecordsService } from './records.service';
import { coachingActor } from './coaching.controller';
import * as c from './practice.contracts';
function businessActor(req: AuthRequest) {
  if (req.principal.session.client !== 'business')
    throw new ForbiddenException();
  return req.principal.user.id;
}
const id = (value: string) => parse(z.uuid(), value);
const dto = async (value: Promise<unknown>) => jsonDto(await value);
const decisionSchema = z
  .object({
    revision: z.number().int().positive(),
    approve: z.boolean(),
    reason: z.string().trim().min(3).max(1000),
  })
  .strict();
const attendanceSchema = z
  .object({ present: z.boolean(), reason: z.string().trim().min(3).max(1000) })
  .strict();
const cancelSchema = z
  .object({
    revision: z.number().int().positive(),
    reason: z.string().trim().min(3).max(1000),
  })
  .strict();
@DomainController('coaching', 'directory')
export class CoachingDirectoryController {
  constructor(private readonly practice: CoachingPracticeService) {}
  @Get() list(@Query() query: unknown) {
    return dto(this.practice.search(parse(c.coachSearchSchema, query)));
  }
  @Get(':id') detail(@Param('id') value: string) {
    return dto(this.practice.detail(id(value)));
  }
}
@DomainController('profile', 'coaching-practice')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class CoachingPracticeController {
  constructor(
    private readonly practice: CoachingPracticeService,
    private readonly records: CoachingRecordsService,
    private readonly commerce: CommerceService,
    private readonly operations: SportsOperationsService,
  ) {}
  @Get() workspace(@Req() req: AuthRequest) {
    return dto(this.practice.workspace(coachingActor(req)));
  }
  @Post() @SchemaBody(c.practiceSchema) save(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    return dto(
      this.practice.save(coachingActor(req), parse(c.practiceSchema, body)),
    );
  }
  @Post('credentials') @SchemaBody(c.credentialSchema) credential(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    return dto(
      this.practice.credential(
        coachingActor(req),
        parse(c.credentialSchema, body),
      ),
    );
  }
  @Post('credentials/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 4 * 1024 * 1024, files: 1, fields: 3 },
    }),
  )
  upload(
    @Req() req: AuthRequest,
    @Body() body: unknown,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return dto(
      this.practice.credential(
        coachingActor(req),
        parse(c.credentialSchema, body),
        file,
      ),
    );
  }
  @Get('credentials/:id/preview') preview(
    @Req() req: AuthRequest,
    @Param('id') value: string,
  ) {
    return this.practice.previewCredential(coachingActor(req), id(value));
  }
  @Post('availability') @SchemaBody(c.availabilitySchema) availability(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    return dto(
      this.practice.availability(
        coachingActor(req),
        parse(c.availabilitySchema, body),
      ),
    );
  }
  @Post('availability/:id/remove') remove(
    @Req() req: AuthRequest,
    @Param('id') value: string,
  ) {
    return dto(this.practice.removeAvailability(coachingActor(req), id(value)));
  }
  @Get('relationships/:id/assessment') assessment(
    @Req() req: AuthRequest,
    @Param('id') value: string,
  ) {
    return dto(this.practice.assessment(coachingActor(req), id(value)));
  }
  @Post('relationships/:id/assessment')
  @SchemaBody(c.assessmentSchema)
  saveAssessment(
    @Req() req: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.practice.assessment(
        coachingActor(req),
        id(value),
        parse(c.assessmentSchema, body),
      ),
    );
  }
  @Get('sessions/:id/note') note(
    @Req() req: AuthRequest,
    @Param('id') value: string,
  ) {
    return dto(this.records.note(coachingActor(req), id(value)));
  }
  @Post('sessions/:id/note') @SchemaBody(c.noteSchema) saveNote(
    @Req() req: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.records.note(
        coachingActor(req),
        id(value),
        parse(c.noteSchema, body),
      ),
    );
  }
  @Post('sessions/:id/approval') @SchemaBody(decisionSchema) approve(
    @Req() req: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    const input = parse(decisionSchema, body);
    return dto(
      this.operations.approve(
        coachingActor(req),
        id(value),
        input.revision,
        input.approve,
        input.reason,
      ),
    );
  }
  @Post('sessions/:id/attendance') @SchemaBody(attendanceSchema) attendance(
    @Req() req: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    const input = parse(attendanceSchema, body);
    return dto(
      this.operations.manualAttendance(
        coachingActor(req),
        id(value),
        input.present,
        input.reason,
      ),
    );
  }
  @Post('occurrences/:id/cancel') @SchemaBody(cancelSchema) cancel(
    @Req() req: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    const input = parse(cancelSchema, body);
    return dto(
      this.operations.cancelOccurrence(
        coachingActor(req),
        id(value),
        input.revision,
        input.reason,
      ),
    );
  }
  @Post('services/:id/sessions') @SchemaBody(occurrenceSchema) schedule(
    @Req() req: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.commerce.schedule(
        coachingActor(req),
        id(value),
        parse(occurrenceSchema, body),
      ),
    );
  }
  @Get('finance') finance(@Req() req: AuthRequest) {
    return dto(this.records.finance(coachingActor(req)));
  }
  @Get('reviews') reviews(@Req() req: AuthRequest) {
    return dto(this.records.myReviews(coachingActor(req)));
  }
  @Post('sessions/:id/review') @SchemaBody(c.coachReviewSchema) review(
    @Req() req: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.records.review(
        coachingActor(req),
        id(value),
        parse(c.coachReviewSchema, body),
      ),
    );
  }
}
@DomainController('business', 'coaching')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class BusinessCoachingController {
  constructor(
    private readonly practice: CoachingPracticeService,
    private readonly records: CoachingRecordsService,
  ) {}
  @Get('candidates') candidates(
    @Req() req: AuthRequest,
    @Query('organizationId') org: string,
    @Query('branchId') branch: string,
  ) {
    return dto(
      this.practice.candidates(businessActor(req), id(org), id(branch)),
    );
  }
  @Post('offerings') @SchemaBody(c.offeringSchema) offering(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    return dto(
      this.practice.createOffering(
        businessActor(req),
        parse(c.offeringSchema, body),
      ),
    );
  }
  @Get('finance') finance(
    @Req() req: AuthRequest,
    @Query('organizationId') org: string,
    @Query('branchId') branch: string,
  ) {
    return dto(this.records.finance(businessActor(req), id(org), id(branch)));
  }
  @Post('contracts') @SchemaBody(c.contractSchema) contract(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    return dto(
      this.records.contract(businessActor(req), parse(c.contractSchema, body)),
    );
  }
  @Post('ledger') @SchemaBody(c.ledgerSchema) ledger(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    return dto(
      this.records.ledger(businessActor(req), parse(c.ledgerSchema, body)),
    );
  }
  @Post('services') @SchemaBody(c.coachingServiceSchema) service(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    return dto(
      this.practice.registerService(
        businessActor(req),
        parse(c.coachingServiceSchema, body),
      ),
    );
  }
}
@DomainController('admin', 'coaching')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class AdminCoachingController {
  constructor(
    private readonly practice: CoachingPracticeService,
    private readonly admin: AdminService,
  ) {}
  @Get() async queue(@Req() req: AuthRequest) {
    await this.admin.requireAdmin(req.principal);
    return dto(this.practice.reviewQueue());
  }
  @Post(':id/review') @SchemaBody(c.reviewPracticeSchema) async review(
    @Req() req: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    await this.admin.requireAdmin(req.principal);
    return dto(
      this.practice.review(
        req.principal.user.id,
        id(value),
        parse(c.reviewPracticeSchema, body),
      ),
    );
  }
  @Get('credentials/:id/preview') async preview(
    @Req() req: AuthRequest,
    @Param('id') value: string,
  ) {
    await this.admin.requireAdmin(req.principal);
    return this.practice.previewCredential(
      req.principal.user.id,
      id(value),
      true,
    );
  }
}
