CREATE TABLE IF NOT EXISTS schools (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  code        TEXT UNIQUE NOT NULL,      -- e.g. "MOGASCO01"
  address     TEXT,
  region      TEXT,
  district    TEXT,
  phone       TEXT,
  logo_url    TEXT,
  ges_circuit TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS academic_years (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID REFERENCES schools(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,             -- e.g. "2025/2026"
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS terms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
  term_number      INTEGER CHECK (term_number IN (1, 2, 3)),
  start_date       DATE,
  end_date         DATE,
  vacation_date    DATE,
  reopening_date   DATE,
  total_school_days INTEGER
);

CREATE TABLE IF NOT EXISTS school_current_context (
  school_id        UUID PRIMARY KEY REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  term_id          UUID NOT NULL REFERENCES terms(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
