CREATE TABLE IF NOT EXISTS scoresheet_config (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID REFERENCES schools(id),
  class_id         UUID REFERENCES classes(id),  -- NULL = all classes
  term_id          UUID REFERENCES terms(id),
  column_count     INTEGER DEFAULT 2,
  columns          JSONB,
  -- e.g. [{"name":"Class Score","key":"class_score","max":40},
  --        {"name":"Exam Score","key":"exam_score","max":60}]
  class_score_max  NUMERIC DEFAULT 40,
  exam_score_max   NUMERIC DEFAULT 60,
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scores (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID REFERENCES students(id) ON DELETE CASCADE,
  subject_id     UUID REFERENCES subjects(id) ON DELETE CASCADE,
  term_id        UUID REFERENCES terms(id) ON DELETE CASCADE,
  entered_by     UUID REFERENCES staff(id),
  class_score    NUMERIC(5,2),
  exam_score     NUMERIC(5,2),
  total_score    NUMERIC(5,2),  -- computed server-side when BOTH components present
  grade          TEXT,
  position       INTEGER,
  subject_remark TEXT,
  is_locked      BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT now(),
  created_by     UUID,
  updated_at     TIMESTAMPTZ DEFAULT now(),
  updated_by     UUID,
  UNIQUE (student_id, subject_id, term_id)
);

CREATE TABLE IF NOT EXISTS scoresheet_submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id   UUID REFERENCES subjects(id),
  class_id     UUID REFERENCES classes(id),
  term_id      UUID REFERENCES terms(id),
  teacher_id   UUID REFERENCES staff(id),
  status       TEXT NOT NULL DEFAULT 'DRAFT'
               CHECK (status IN ('DRAFT','IN_PROGRESS','SUBMITTED','REOPENED','LOCKED')),
  submitted_at TIMESTAMPTZ,
  locked_at    TIMESTAMPTZ,
  locked_by    UUID,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (subject_id, class_id, term_id)
);

-- Performance indexes for scores table
CREATE INDEX ON scores (term_id);
CREATE INDEX ON scores (student_id);
CREATE INDEX ON scores (subject_id);
