-- Additive indexes only; no catalog, account or transaction data is changed.
CREATE INDEX IF NOT EXISTS sport_services_scope_created ON sport_services(organization_id,branch_id,created_at DESC,id);
CREATE INDEX IF NOT EXISTS sport_orders_service_created ON sport_orders(service_id,created_at DESC,id);
CREATE INDEX IF NOT EXISTS sport_orders_org_created ON sport_orders(organization_id,created_at DESC,id);
CREATE INDEX IF NOT EXISTS sport_payments_verified_date ON sport_payments(verified_at,order_id) WHERE state='verified';
CREATE INDEX IF NOT EXISTS sport_refunds_order_state ON sport_refunds(order_id,state);
CREATE INDEX IF NOT EXISTS sport_occurrences_service_date ON sport_occurrences(service_id,start_at,id);
CREATE INDEX IF NOT EXISTS sport_memberships_scope_created ON sport_memberships(organization_id,branch_id,created_at DESC,id);
CREATE INDEX IF NOT EXISTS sport_attendance_present_date ON sport_attendance(created_at,reservation_id) WHERE status='present';
