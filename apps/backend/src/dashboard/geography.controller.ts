import { Controller, Get, Header, Req } from '@nestjs/common';
import type { Request } from 'express';

import { Auth } from '../onboarding/auth';
import { tokenOf } from '../onboarding/auth.controller';
import { Database } from '../onboarding/database';

type Counts = {
  clubs: number;
  coaches: number;
  users: number;
  classes: number;
  reservations: number;
};
type GeographyCounts = Counts & {
  unassigned: Counts;
  provinces: (Counts & { code: string })[];
};

@Controller('api/v1/admin/dashboard')
export class DashboardGeographyController {
  constructor(
    private readonly auth: Auth,
    private readonly db: Database,
  ) {}

  @Get('geography')
  @Header('Cache-Control', 'no-store')
  async geography(@Req() request: Request): Promise<GeographyCounts> {
    await this.auth.verify(tokenOf(request, 'admin'), 'admin');

    const { rows } = await this.db.pool.query<GeographyCounts>(`
      WITH provinces AS (
        SELECT p.id, p.code FROM club_resources p JOIN club_resources country ON country.id = p.parent_id
        WHERE p.kind = 'provinces' AND country.kind = 'countries' AND country.code = 'ir'
      ), club_locations AS (
        SELECT c.id, p.code FROM clubs c
        LEFT JOIN provinces p ON p.id::text = (c.profile #>> '{location,provinceId}')
      ), class_locations AS (
        SELECT s.id, c.code FROM fitness_sessions s JOIN club_locations c ON c.id = s.club_id
      ), reservation_locations AS (
        SELECT r.id, r.phone, s.code FROM fitness_reservations r JOIN class_locations s ON s.id = r.session_id
      ), memberships AS (
        SELECT DISTINCT m.account_id, c.code FROM club_memberships m JOIN club_locations c ON c.id = m.club_id
        WHERE c.code IS NOT NULL
      ), approved_coaches AS (
        SELECT DISTINCT applicant_id AS account_id FROM coach_requests WHERE status = 'approved'
      ), coach_locations AS (
        SELECT m.* FROM memberships m JOIN approved_coaches a USING (account_id)
      ), user_locations AS (
        SELECT account_id, code FROM memberships
        UNION
        SELECT a.id, r.code FROM reservation_locations r JOIN accounts a ON a.phone = r.phone
        WHERE r.code IS NOT NULL
      ), provincial_counts AS (
        SELECT code,
          count(*) FILTER (WHERE metric = 'clubs')::int AS clubs,
          count(*) FILTER (WHERE metric = 'coaches')::int AS coaches,
          count(*) FILTER (WHERE metric = 'users')::int AS users,
          count(*) FILTER (WHERE metric = 'classes')::int AS classes,
          count(*) FILTER (WHERE metric = 'reservations')::int AS reservations
        FROM (
          SELECT code, 'clubs' AS metric FROM club_locations
          UNION ALL SELECT code, 'coaches' FROM coach_locations
          UNION ALL SELECT code, 'users' FROM user_locations
          UNION ALL SELECT code, 'classes' FROM class_locations
          UNION ALL SELECT code, 'reservations' FROM reservation_locations
        ) AS metrics WHERE code IS NOT NULL
        GROUP BY code
      )
      SELECT
        (SELECT count(*)::int FROM club_locations) AS clubs,
        (SELECT count(*)::int FROM approved_coaches) AS coaches,
        (SELECT count(*)::int FROM accounts) AS users,
        (SELECT count(*)::int FROM class_locations) AS classes,
        (SELECT count(*)::int FROM reservation_locations) AS reservations,
        json_build_object(
          'clubs', (SELECT count(*)::int FROM club_locations WHERE code IS NULL),
          'coaches', (SELECT count(*)::int FROM approved_coaches a
                      WHERE NOT EXISTS (SELECT 1 FROM coach_locations c WHERE c.account_id = a.account_id)),
          'users', (SELECT count(*)::int FROM accounts a
                    WHERE NOT EXISTS (SELECT 1 FROM user_locations u WHERE u.account_id = a.id)),
          'classes', (SELECT count(*)::int FROM class_locations WHERE code IS NULL),
          'reservations', (SELECT count(*)::int FROM reservation_locations WHERE code IS NULL)
        ) AS unassigned,
        COALESCE((SELECT json_agg(p ORDER BY code) FROM provincial_counts p), '[]'::json) AS provinces
    `);
    return rows[0];
  }
}
