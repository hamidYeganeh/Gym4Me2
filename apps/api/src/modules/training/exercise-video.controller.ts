import { Body, Param, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { ClientHeader, parse } from '../auth/auth.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { ConsentGuard } from '../profile/consent.guard';
import { SchemaBody } from '../clubs/club.contracts';
import { AdminService } from '../admin/admin.service';
import { ExerciseVideoService, exerciseVideo } from './exercise-video.service';
@DomainController('admin', 'training')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class ExerciseVideoController {
  constructor(
    private readonly admin: AdminService,
    private readonly videos: ExerciseVideoService,
  ) {}
  @Post('exercises/:id/video') @SchemaBody(exerciseVideo) async save(
    @Req() req: AuthRequest,
    @Param('id') id: unknown,
    @Body() body: unknown,
  ) {
    await this.admin.requireAdmin(req.principal);
    return this.videos.save(
      req.principal.user.id,
      parse(z.string().min(1).max(80), id),
      parse(exerciseVideo, body),
    );
  }
}
