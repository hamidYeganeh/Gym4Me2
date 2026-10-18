ALTER TABLE sport_invitations DROP CONSTRAINT sport_invitations_status_check;
ALTER TABLE sport_invitations ADD CONSTRAINT sport_invitations_status_check CHECK(status IN ('invited','accepted','declined','cancelled'));
ALTER TABLE sport_invitations
  ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK(revision > 0),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN answered_at timestamptz,
  ADD COLUMN cancelled_at timestamptz;
CREATE INDEX sport_invitation_recipient_page ON sport_invitations(user_id,created_at DESC,id DESC);
CREATE INDEX sport_invitation_host_page ON sport_invitations(service_id,created_at DESC,id DESC);
