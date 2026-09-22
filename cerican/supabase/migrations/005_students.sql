CREATE TABLE IF NOT EXISTS students (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id_code TEXT,
  UNIQUE (school_id, student_id_code),
  surname         TEXT NOT NULL,
  first_name      TEXT NOT NULL,
  other_names     TEXT,
  gender          TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
  date_of_birth   DATE,
  photo_url       TEXT,
  class_id        UUID REFERENCES classes(id),  -- current class only
  is_active       BOOLEAN DEFAULT true,
  user_id         UUID,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  created_by      UUID,
  updated_at      TIMESTAMPTZ DEFAULT now(),
  updated_by      UUID
);

CREATE TABLE IF NOT EXISTS student_enrollments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  class_id         UUID NOT NULL REFERENCES classes(id),
  enrollment_status TEXT NOT NULL DEFAULT 'active',
  start_date       DATE,
  end_date         DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, academic_year_id)
);
