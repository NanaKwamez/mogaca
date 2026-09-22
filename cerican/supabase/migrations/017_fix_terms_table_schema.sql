-- =========================================================================
-- 017 - Fix terms table schema: correct column names, add missing columns
-- Problem: user added column literally named "terms(total_school_days)"
-- instead of "total_school_days", and terms table was missing academic_year_id
-- and term_number columns required by the app schema (see 001_initial.sql).
-- =========================================================================

BEGIN;

-- 1. Copy the value out of the badly-named column before we drop it
DO $$
DECLARE
  v_total numeric;
BEGIN
  BEGIN
    EXECUTE 'SELECT "terms(total_school_days)" FROM public.terms WHERE is_current = true LIMIT 1' INTO v_total;
    IF v_total IS NULL THEN
      v_total := 100;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_total := 100;
  END;

  -- 2. Add the proper total_school_days INTEGER column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'terms' AND column_name = 'total_school_days'
  ) THEN
    ALTER TABLE public.terms ADD COLUMN total_school_days INTEGER;
  END IF;

  -- 3. Populate total_school_days (default 100 for all terms, use copied value if available)
  UPDATE public.terms SET total_school_days = COALESCE(v_total, 100) WHERE total_school_days IS NULL;
END $$;

-- 4. Drop the badly named column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'terms' AND column_name = 'terms(total_school_days)'
  ) THEN
    ALTER TABLE public.terms DROP COLUMN "terms(total_school_days)";
  END IF;
END $$;

-- 5. Add academic_year_id column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'terms' AND column_name = 'academic_year_id'
  ) THEN
    ALTER TABLE public.terms ADD COLUMN academic_year_id UUID REFERENCES public.academic_years(id);
  END IF;
END $$;

-- 6. Populate academic_year_id using "year" column + matching academic_years
UPDATE public.terms t
SET academic_year_id = ay.id
FROM public.academic_years ay
WHERE t.academic_year_id IS NULL
  AND (
    (ay.label = (t.year || '/' || (t.year + 1)))
    OR (ay.label = ((t.year - 1) || '/' || t.year))
  );

-- If any still null, match to the 2026/2027 academic year (the only one that exists)
UPDATE public.terms t
SET academic_year_id = (SELECT id FROM public.academic_years WHERE label = '2026/2027' LIMIT 1)
WHERE t.academic_year_id IS NULL;

-- 7. Add term_number column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'terms' AND column_name = 'term_number'
  ) THEN
    ALTER TABLE public.terms ADD COLUMN term_number INTEGER CHECK (term_number IN (1, 2, 3));
  END IF;
END $$;

-- 8. Populate term_number from the "term" enum column
UPDATE public.terms SET term_number = (term::text)::INTEGER WHERE term_number IS NULL;

-- 9. Add the other optional columns from the 001 schema if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'terms' AND column_name = 'vacation_date'
  ) THEN
    ALTER TABLE public.terms ADD COLUMN vacation_date DATE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'terms' AND column_name = 'reopening_date'
  ) THEN
    ALTER TABLE public.terms ADD COLUMN reopening_date DATE;
  END IF;
END $$;

COMMIT;
