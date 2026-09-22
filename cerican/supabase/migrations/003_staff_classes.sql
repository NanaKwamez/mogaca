CREATE TABLE IF NOT EXISTS staff (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID REFERENCES schools(id) ON DELETE CASCADE,
  staff_id_code TEXT,
  UNIQUE (school_id, staff_id_code),
  first_name   TEXT NOT NULL,
  surname      TEXT NOT NULL,
  other_names  TEXT,
  gender       TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
  staff_type   TEXT DEFAULT 'Teacher',
  contact_one  TEXT,
  contact_two  TEXT,
  email        TEXT,
  photo_url    TEXT,
  date_joined  DATE,
  is_active    BOOLEAN DEFAULT true,
  must_change_password BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  user_id      UUID,
  created_at   TIMESTAMPTZ DEFAULT now(),
  created_by   UUID,
  updated_at   TIMESTAMPTZ DEFAULT now(),
  updated_by   UUID
);

CREATE TABLE IF NOT EXISTS class_divisions (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  name      TEXT NOT NULL,             -- "Preschool", "Primary", "JHS"
  levels    TEXT[]
);

CREATE TABLE IF NOT EXISTS classes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID REFERENCES schools(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  level_order      INTEGER,
  division_id      UUID REFERENCES class_divisions(id),
  max_students     INTEGER DEFAULT 40,
  created_at       TIMESTAMPTZ DEFAULT now()
);
