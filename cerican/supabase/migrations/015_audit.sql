CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID REFERENCES schools(id),
  user_id     UUID,
  user_role   TEXT,
  action      TEXT,
  table_name  TEXT,
  record_id   UUID,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID REFERENCES schools(id),
  recipient_type TEXT,                    -- "admin", "teacher", "parent", "student"
  recipient_id   UUID,
  title          TEXT,
  body           TEXT,
  channel        TEXT,                    -- "in_app", "sms", "email"
  sent_at        TIMESTAMPTZ,
  is_read        BOOLEAN DEFAULT false,
  reference_type TEXT,
  reference_id   UUID
);
