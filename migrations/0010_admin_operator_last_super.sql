-- DB-atomic last-enabled-super-admin invariant.
-- Application UPDATEs still re-check in the same statement; these triggers
-- abort any concurrent or out-of-band demote/disable/delete that would
-- remove the final enabled super_admin. Empty admin_operator is still
-- allowed so staging bootstrap can insert the first row.

CREATE TRIGGER IF NOT EXISTS protect_last_enabled_super_admin_update BEFORE UPDATE ON admin_operator FOR EACH ROW WHEN OLD.role = 'super_admin' AND OLD.enabled = 1 AND (NEW.role != 'super_admin' OR NEW.enabled = 0) AND (SELECT COUNT(*) FROM admin_operator WHERE role = 'super_admin' AND enabled = 1 AND user_id != OLD.user_id) = 0 BEGIN SELECT RAISE(ABORT, 'last enabled super admin'); END;

CREATE TRIGGER IF NOT EXISTS protect_last_enabled_super_admin_delete BEFORE DELETE ON admin_operator FOR EACH ROW WHEN OLD.role = 'super_admin' AND OLD.enabled = 1 AND (SELECT COUNT(*) FROM admin_operator WHERE role = 'super_admin' AND enabled = 1 AND user_id != OLD.user_id) = 0 BEGIN SELECT RAISE(ABORT, 'last enabled super admin'); END;
