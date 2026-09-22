CREATE TABLE IF NOT EXISTS subjects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID REFERENCES schools(id),
  name          TEXT NOT NULL,
  code          TEXT,
  class_id      UUID REFERENCES classes(id),
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subject_teacher_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id       UUID REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id       UUID REFERENCES staff(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id),
  term_id          UUID REFERENCES terms(id),
  UNIQUE (subject_id, teacher_id, term_id)
);

CREATE TABLE IF NOT EXISTS subject_groups (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  group_key TEXT NOT NULL,   -- "VERBAL", "NUMERICAL", "PRACTICAL", "THEORY"
  name      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subject_group_members (
  subject_group_id UUID NOT NULL REFERENCES subject_groups(id),
  subject_id       UUID NOT NULL REFERENCES subjects(id),
  PRIMARY KEY (subject_group_id, subject_id)
);

CREATE TABLE IF NOT EXISTS aggregate_rules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,          -- "Four Core + Two Elective"
  division         TEXT,
  selection_method TEXT NOT NULL,          -- "four_cores_two_electives", "best_six"
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS aggregate_rule_subjects (
  aggregate_rule_id UUID NOT NULL REFERENCES aggregate_rules(id) ON DELETE CASCADE,
  subject_id        UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  category          TEXT,                  -- "core", "elective"
  rank              INTEGER,
  PRIMARY KEY (aggregate_rule_id, subject_id)
);
