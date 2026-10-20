import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { nextRelationshipStatus } from './coaching.service';
import { coachingInviteSchema } from './coaching.contracts';

const now = new Date('2026-10-20T10:00:00Z');
const pending = {
  id: 'relationship',
  coachId: 'coach',
  studentId: 'student',
  status: 'pending' as const,
  expiresAt: new Date('2026-10-21T10:00:00Z'),
};
describe('coaching relationship permissions and lifecycle', () => {
  it('only the recipient can accept or decline', () => {
    for (const action of ['accept', 'decline'] as const) {
      expect(() =>
        nextRelationshipStatus(pending, 'coach', action, now),
      ).toThrow(ForbiddenException);
      expect(nextRelationshipStatus(pending, 'student', action, now)).toBe(
        action === 'accept' ? 'active' : 'declined',
      );
    }
  });
  it.each(['accept', 'decline', 'end'] as const)(
    'hides the relationship from an unrelated actor: %s',
    (action) => {
      expect(() =>
        nextRelationshipStatus(pending, 'stranger', action, now),
      ).toThrow(NotFoundException);
    },
  );
  it('rejects acceptance at expiry, including the exact boundary', () => {
    expect(() =>
      nextRelationshipStatus(
        { ...pending, expiresAt: now },
        'student',
        'accept',
        now,
      ),
    ).toThrow(ConflictException);
  });
  it.each(['coach', 'student'])(
    'either participant can end collaboration: %s',
    (actor) => {
      expect(
        nextRelationshipStatus(
          { ...pending, status: 'active' },
          actor,
          'end',
          now,
        ),
      ).toBe('ended');
    },
  );
  it('does not let a stale accept resurrect ended collaboration', () => {
    expect(() =>
      nextRelationshipStatus(
        { ...pending, status: 'ended' },
        'student',
        'accept',
        now,
      ),
    ).toThrow(ConflictException);
  });
  it('keeps successful answers idempotent', () => {
    expect(
      nextRelationshipStatus(
        { ...pending, status: 'active' },
        'student',
        'accept',
        now,
      ),
    ).toBe('active');
    expect(
      nextRelationshipStatus(
        { ...pending, status: 'ended' },
        'coach',
        'end',
        now,
      ),
    ).toBe('ended');
  });
  it('does not let a coach turn a declined invitation into ended', () => {
    expect(() =>
      nextRelationshipStatus(
        { ...pending, status: 'declined' },
        'coach',
        'end',
        now,
      ),
    ).toThrow(ConflictException);
  });
  it('normalizes Persian phones and rejects extra fields', () => {
    expect(coachingInviteSchema.parse({ phone: '۰۹۰۰۰۰۰۰۰۰۳' }).phone).toBe(
      '+989000000003',
    );
    expect(
      coachingInviteSchema.safeParse({
        phone: '09000000003',
        studentId: 'other',
      }).success,
    ).toBe(false);
  });
  it('coach answers a student-initiated request, and the sender cannot self-accept', () => {
    const request = { ...pending, initiatedBy: 'student' };
    expect(nextRelationshipStatus(request, 'coach', 'accept', now)).toBe(
      'active',
    );
    expect(() =>
      nextRelationshipStatus(request, 'student', 'accept', now),
    ).toThrow(ForbiddenException);
  });
});
