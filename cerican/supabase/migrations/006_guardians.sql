CREATE TABLE IF NOT EXISTS guardians (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name  TEXT NOT NULL,
  phone_one  TEXT,
  phone_two  TEXT,
  email      TEXT,
  user_id    UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_guardians (
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guardian_id   UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  relationship  TEXT NOT NULL,          -- "Mother", "Father", "Guardian"
  is_primary    BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, guardian_id)
);
