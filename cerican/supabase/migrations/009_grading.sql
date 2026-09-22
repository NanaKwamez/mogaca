CREATE TABLE IF NOT EXISTS grading_schemas (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  name      TEXT DEFAULT 'GES Standard',
  is_active BOOLEAN DEFAULT true,
  bands     JSONB
  -- e.g. [{"min":80,"max":100,"grade":"A1","remark":"Excellent"},
  --        {"min":70,"max":79,"grade":"B2","remark":"Very Good"}, ...]
);

CREATE TABLE IF NOT EXISTS assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id      UUID REFERENCES subjects(id),
  teacher_id      UUID REFERENCES staff(id),
  term_id         UUID REFERENCES terms(id),
  title           TEXT NOT NULL,
  assignment_type TEXT,  -- "Class Work", "Homework", "Project", "Quiz", "Test"
  sequence_number INTEGER,
  max_score       NUMERIC(5,2),
  assigned_date   DATE DEFAULT CURRENT_DATE,
  due_date        DATE,
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignment_scores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  student_id    UUID REFERENCES students(id) ON DELETE CASCADE,
  score         NUMERIC(5,2),
  submitted_at  TIMESTAMPTZ,
  UNIQUE (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS attendance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID REFERENCES students(id) ON DELETE CASCADE,
  class_id    UUID REFERENCES classes(id),
  term_id     UUID REFERENCES terms(id),
  date        DATE NOT NULL,
  status      TEXT CHECK (status IN ('Present', 'Absent', 'Late', 'Excused')),
  recorded_by UUID REFERENCES staff(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, date)
);
