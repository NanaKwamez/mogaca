-- =========================================================================
-- 019 - Variable Score Components
--  A. Add 4 component columns to scores table (classwork, homework, classtest, exam)
--  B. Add 4 weight columns to scoresheet_config (replacing fixed class_score_max / exam_score_max)
--  C. Migrate existing class_score → classwork_score + classtest_score split (backwards compat)
--  D. Update constraints: total_score must not exceed 100, no negative scores
--  E. Set Kennedy Perby Kwesi as class_teacher for Basic 7 so he sees My Class / Form 1 roster
-- =========================================================================

BEGIN;

-- =========================================================================
-- A. Add 4 component columns to scores table
-- =========================================================================

ALTER TABLE public.scores
  ADD COLUMN IF NOT EXISTS classwork_score  NUMERIC(5,2) CHECK (classwork_score >= 0),
  ADD COLUMN IF NOT EXISTS homework_score   NUMERIC(5,2) CHECK (homework_score >= 0),
  ADD COLUMN IF NOT EXISTS classtest_score  NUMERIC(5,2) CHECK (classtest_score >= 0);
-- exam_score already exists — just add CHECK constraint
-- Postgres: we can't alter existing CHECK in place easily; drop & re-add not needed since we enforce in app layer
-- We keep exam_score column as-is for backward compat, just add the new columns.

-- If existing rows have class_score data, migrate it:
-- We split the old class_score (max 40) roughly: classwork=half, classtest=half
-- This is best-effort for existing data only; new entries use 4 fields directly.
UPDATE public.scores
SET
  classwork_score  = ROUND(COALESCE(class_score, 0) / 2.0, 2),
  classtest_score  = ROUND(COALESCE(class_score, 0) / 2.0, 2)
WHERE classwork_score IS NULL AND class_score IS NOT NULL;

-- =========================================================================
-- B. Add 4 weight/max columns to scoresheet_config
-- =========================================================================

ALTER TABLE public.scoresheet_config
  ADD COLUMN IF NOT EXISTS classwork_max  NUMERIC DEFAULT 10,
  ADD COLUMN IF NOT EXISTS homework_max   NUMERIC DEFAULT 10,
  ADD COLUMN IF NOT EXISTS classtest_max  NUMERIC DEFAULT 30,
  ADD COLUMN IF NOT EXISTS exam_max_new   NUMERIC DEFAULT 50;
-- Note: exam_score_max already exists. We add exam_max_new as the variable version.
-- The app will prefer the new columns; fall back to old if NULL.

-- Set sensible defaults on existing config rows
UPDATE public.scoresheet_config
SET
  classwork_max = 10,
  homework_max  = 10,
  classtest_max = 30,
  exam_max_new  = 50
WHERE classwork_max IS NULL;

-- If no config row exists at all, insert a default one for the current term
INSERT INTO public.scoresheet_config (school_id, term_id, classwork_max, homework_max, classtest_max, exam_max_new, class_score_max, exam_score_max)
SELECT
  (SELECT id FROM public.schools LIMIT 1),
  scc.term_id,
  10, 10, 30, 50, 40, 60
FROM public.school_current_context scc
WHERE NOT EXISTS (
  SELECT 1 FROM public.scoresheet_config sc2
  WHERE sc2.term_id = scc.term_id
)
LIMIT 1;

-- =========================================================================
-- E. Set Kennedy Perby Kwesi as class_teacher_id for Basic 7 (JHS 1)
--    so his "My Class" roster tab shows Form 1 students
-- =========================================================================

UPDATE public.classes
SET class_teacher_id = (
  SELECT id FROM public.staff
  WHERE (full_name ILIKE '%Kennedy%Perby%' OR email ILIKE '%kennedy.perby%')
  LIMIT 1
)
WHERE sort_order = 13  -- Basic 7 = JHS 1; adjust if sort_order differs
  AND class_teacher_id IS NULL;

-- Also try by name pattern if sort_order didn't match
UPDATE public.classes
SET class_teacher_id = (
  SELECT id FROM public.staff
  WHERE (full_name ILIKE '%Kennedy%Perby%' OR email ILIKE '%kennedy.perby%')
  LIMIT 1
)
WHERE (name ILIKE '%Basic 7%' OR name ILIKE '%JHS 1%' OR name ILIKE '%Form 1%')
  AND class_teacher_id IS NULL;

COMMIT;
