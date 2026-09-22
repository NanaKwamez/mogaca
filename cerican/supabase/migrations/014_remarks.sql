CREATE TABLE IF NOT EXISTS remark_thresholds (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id                 UUID NOT NULL REFERENCES schools(id),
  verbal_numerical_diff     NUMERIC DEFAULT 15,
  practical_theory_diff     NUMERIC DEFAULT 15,
  classwork_exam_diff       NUMERIC DEFAULT 15,
  consistent_spread         NUMERIC DEFAULT 10,
  inconsistent_spread       NUMERIC DEFAULT 30,
  low_attendance_pct        NUMERIC DEFAULT 80,
  excellent_attendance_pct  NUMERIC DEFAULT 95,
  trend_position_change     INTEGER DEFAULT 3,
  max_remark_chars          INTEGER DEFAULT 200
);

CREATE TABLE IF NOT EXISTS remark_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_key      TEXT NOT NULL,
  clause_slot      TEXT NOT NULL CHECK (clause_slot IN ('primary', 'secondary')),
  remark_type      TEXT NOT NULL CHECK (remark_type IN ('headteacher', 'class_teacher')),
  gender           TEXT NOT NULL DEFAULT 'Any'
                   CHECK (gender IN ('Male', 'Female', 'Other', 'Any')),
  tone             TEXT NOT NULL DEFAULT 'professional_warm',
  division         TEXT,
  variant_index    INTEGER NOT NULL,
  variant_text     TEXT NOT NULL,
  max_chars        INTEGER DEFAULT 200,
  is_active        BOOLEAN DEFAULT true,
  template_version INTEGER NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pattern_key, clause_slot, remark_type, gender, tone, division, variant_index, template_version)
);

-- Reports and versioning (referenced by remark_generation_log)
CREATE TABLE IF NOT EXISTS student_reports (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            UUID REFERENCES students(id) ON DELETE CASCADE,
  term_id               UUID REFERENCES terms(id) ON DELETE CASCADE,
  class_id              UUID REFERENCES classes(id),
  total_score           NUMERIC(6,2),
  aggregate             NUMERIC(5,2),
  overall_position      INTEGER,
  out_of                INTEGER,
  headteacher_remark_id UUID,
  class_teacher_remark_id UUID,
  next_term_begins      DATE,
  attendance_days_present INTEGER,
  total_school_days     INTEGER,
  status                TEXT NOT NULL DEFAULT 'DRAFT'
                        CHECK (status IN ('DRAFT','READY_FOR_REVIEW','PUBLISHED','REOPENED','SUPERSEDED')),
  effective_aggregate_rule_id UUID,
  generated_at          TIMESTAMPTZ,
  published_at          TIMESTAMPTZ,
  UNIQUE (student_id, term_id)
);

CREATE TABLE IF NOT EXISTS report_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id         UUID NOT NULL REFERENCES student_reports(id) ON DELETE CASCADE,
  version_number    INTEGER NOT NULL,
  score_snapshot    JSONB NOT NULL,
  remark_snapshot   JSONB NOT NULL,
  settings_snapshot JSONB NOT NULL,
  pdf_url           TEXT,
  generated_by      UUID,
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_id, version_number)
);

CREATE TABLE IF NOT EXISTS remark_generation_log (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_report_id       UUID NOT NULL REFERENCES student_reports(id),
  remark_type             TEXT NOT NULL,
  primary_pattern_key     TEXT NOT NULL,
  secondary_pattern_key   TEXT,
  primary_template_id     UUID REFERENCES remark_templates(id),
  secondary_template_id   UUID REFERENCES remark_templates(id),
  primary_variant_index   INTEGER,
  secondary_variant_index INTEGER,
  template_version_snapshot INTEGER,
  generated_text          TEXT NOT NULL,
  final_text              TEXT,
  status                  TEXT NOT NULL DEFAULT 'GENERATED'
                          CHECK (status IN ('NOT_STARTED','GENERATED','EDITED','APPROVED','MANUAL_REVIEW_REQUIRED')),
  source                  TEXT NOT NULL DEFAULT 'SYSTEM_GENERATED'
                          CHECK (source IN ('SYSTEM_GENERATED','ADMIN_EDITED','MANUAL')),
  was_edited              BOOLEAN NOT NULL DEFAULT false,
  generated_by            UUID,
  edited_by               UUID,
  edited_at               TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id             UUID REFERENCES schools(id),
  class_id              UUID REFERENCES classes(id),
  term_id               UUID REFERENCES terms(id),
  use_new_ges_format    BOOLEAN DEFAULT false,
  show_aggregate        BOOLEAN DEFAULT true,
  show_raw_score        BOOLEAN DEFAULT true,
  show_overall_position BOOLEAN DEFAULT true,
  show_subject_code     BOOLEAN DEFAULT false,
  show_raw_class_score  BOOLEAN DEFAULT true,
  show_raw_exam_score   BOOLEAN DEFAULT true,
  show_grades_column    BOOLEAN DEFAULT true,
  show_subject_remarks  BOOLEAN DEFAULT true,
  show_subject_position BOOLEAN DEFAULT false,
  show_signature        BOOLEAN DEFAULT true,
  show_grading_schema   BOOLEAN DEFAULT true,
  aggregate_rule_id     UUID REFERENCES aggregate_rules(id),
  auto_headteacher_remarks BOOLEAN DEFAULT true,
  auto_class_teacher_remarks BOOLEAN DEFAULT true,
  remarks_tone          TEXT DEFAULT 'professional_warm',
  max_remark_chars      INTEGER DEFAULT 200,
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fee_types (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID REFERENCES schools(id),
  name         TEXT NOT NULL,
  term_id      UUID REFERENCES terms(id),
  class_id     UUID REFERENCES classes(id),
  is_mandatory BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS fee_assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id),
  fee_type_id     UUID NOT NULL REFERENCES fee_types(id),
  amount_assessed NUMERIC(10,2) NOT NULL,
  due_date        DATE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_assessment_id  UUID NOT NULL REFERENCES fee_assessments(id),
  amount             NUMERIC(10,2) NOT NULL,
  payment_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method     TEXT NOT NULL,
  receipt_number     TEXT NOT NULL UNIQUE,
  recorded_by        UUID REFERENCES staff(id),
  status             TEXT NOT NULL DEFAULT 'posted'
                     CHECK (status IN ('posted', 'void', 'refund', 'correction')),
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- Performance indexes (created only when the target table/column exists and index not present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_enrollments' AND column_name = 'academic_year_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'student_enrollments_academic_year_id_idx'
  ) THEN
    CREATE INDEX student_enrollments_academic_year_id_idx ON student_enrollments (academic_year_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_enrollments' AND column_name = 'class_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'student_enrollments_class_id_idx'
  ) THEN
    CREATE INDEX student_enrollments_class_id_idx ON student_enrollments (class_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'fee_assessment_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'payments_fee_assessment_id_idx'
  ) THEN
    CREATE INDEX payments_fee_assessment_id_idx ON payments (fee_assessment_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'remark_generation_log' AND column_name = 'student_report_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'remark_generation_log_student_report_id_idx'
  ) THEN
    CREATE INDEX remark_generation_log_student_report_id_idx ON remark_generation_log (student_report_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_log' AND column_name = 'school_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'audit_log_school_id_created_at_idx'
  ) THEN
    CREATE INDEX audit_log_school_id_created_at_idx ON audit_log (school_id, created_at DESC);
  END IF;
END
$$;
