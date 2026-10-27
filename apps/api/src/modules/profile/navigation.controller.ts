import { Get, Req, UseGuards } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { ClientHeader } from '../auth/auth.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { rows } from '../commerce/commerce.service';
import { ConsentGuard } from './consent.guard';

@DomainController('profile', 'navigation')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class ProductNavigationController {
  constructor(private readonly database: DatabaseService) {}

  @Get() async get(@Req() request: AuthRequest) {
    const actor = request.principal.user.id;
    const [result] = await rows(
      this.database.db,
      sql`WITH memberships AS (
        SELECT * FROM organization_members WHERE user_id=${actor}
      ) SELECT
        EXISTS(SELECT 1 FROM coaching_practices WHERE user_id=${actor}) AS "canCoach",
        (EXISTS(SELECT 1 FROM sport_documents WHERE user_id=${actor}) OR
          EXISTS(SELECT 1 FROM sport_orders o JOIN sport_service_versions v ON v.id=o.version_id WHERE o.user_id=${actor} AND o.status IN ('awaiting_payment','partially_paid','paid') AND jsonb_array_length(v.requirements)>0)) AS "documents",
        EXISTS(SELECT 1 FROM sport_waitlist WHERE user_id=${actor} AND status IN ('waiting','offered')) AS waiting,
        EXISTS(SELECT 1 FROM sport_conversations c JOIN sport_occurrences o ON o.id=c.occurrence_id JOIN sport_services s ON s.id=o.service_id WHERE
          EXISTS(SELECT 1 FROM sport_reservations r WHERE r.occurrence_id=c.occurrence_id AND r.user_id=${actor} AND r.status IN ('confirmed','completed')) OR
          EXISTS(SELECT 1 FROM memberships m WHERE m.organization_id=s.organization_id AND m.role IN ('owner','manager') AND
            (m.role='owner' OR m.all_branches OR EXISTS(SELECT 1 FROM organization_member_branches g WHERE g.member_id=m.id AND g.branch_id=s.branch_id)))) AS messages,
        EXISTS(SELECT 1 FROM sport_dependents WHERE guardian_id=${actor} AND status='active') AS family,
        (EXISTS(SELECT 1 FROM training_assignments WHERE athlete_id=${actor}) OR EXISTS(SELECT 1 FROM sport_program_requests WHERE athlete_id=${actor} OR coach_id=${actor})) AS "programHistory",
        EXISTS(SELECT 1 FROM organization_invitations WHERE phone=${request.principal.user.phone} AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now()) AS "teamInvites",
        EXISTS(SELECT 1 FROM memberships WHERE role IN ('owner','manager')) AS manage,
        EXISTS(SELECT 1 FROM memberships WHERE role IN ('owner','manager','receptionist')) AS operate,
        EXISTS(SELECT 1 FROM memberships WHERE role IN ('owner','manager','accountant')) AS finance,
        EXISTS(SELECT 1 FROM sport_services s JOIN memberships m ON m.organization_id=s.organization_id JOIN organizations org ON org.id=s.organization_id WHERE
          (s.status='published' OR EXISTS(SELECT 1 FROM sport_orders o WHERE o.service_id=s.id)) AND org.status='approved' AND m.role IN ('owner','manager','accountant') AND
          (m.role='owner' OR m.all_branches OR EXISTS(SELECT 1 FROM organization_member_branches g WHERE g.member_id=m.id AND g.branch_id=s.branch_id))) AS "businessReady",
        EXISTS(SELECT b.organization_id FROM branches b JOIN memberships m ON m.organization_id=b.organization_id WHERE m.role='owner' OR m.role='manager' AND m.all_branches GROUP BY b.organization_id HAVING count(*)>1) AS "multipleBranches"`,
    );
    return result;
  }
}
