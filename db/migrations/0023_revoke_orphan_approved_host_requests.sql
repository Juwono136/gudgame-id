-- Revoke approved host role requests whose users no longer hold Host/super_admin.
-- Fixes rows left as "approved" after Host was removed via User Management.

UPDATE "host_role_requests" AS h
SET
  "status" = 'revoked',
  "rejection_reason" = COALESCE(
    h."rejection_reason",
    'Host role was removed by an administrator.'
  ),
  "reviewed_at" = COALESCE(h."reviewed_at", NOW()),
  "updated_at" = NOW()
WHERE h."status" = 'approved'
  AND NOT EXISTS (
    SELECT 1
    FROM "user_role_assignments" AS ura
    WHERE ura."user_id" = h."user_id"
      AND ura."role" IN ('host', 'super_admin')
  );
