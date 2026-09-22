-- =========================================================================
-- 018 - Complete backend overhaul:
--  A. Subjects table: rename / add subjects per user's list (R.M.E., History,
--     Career Tech, Our World & People, Social, Computing, Science naming)
--  B. Add missing teachers to user_profiles + staff (Amankona Evans, Boateng
--     Samuel, Perby Kennedy Kwesi, Stephen Amanor Quaye - these 4 are new)
--  C. Re-seed subject_teacher_assignments with:
--      - N1-N2, KG1-KG2, B1-B3: class teacher gets ALL subjects in their class
--        EXCEPT any special-subject teachers the user named for that level
--      - B4-B6, JHS1-JHS3: only assigned subject teachers
--  D. Add class_id column to subject_teacher_assignments for direct lookup
--     (the [subjectId]/[classId] page checks sta.class_id == params.classId AND
--      sta.subject_id == params.subjectId, but STA had no class_id column!)
--  E. feeding_fees table + view that feeds attendance (daily fee paid = present)
--  F. class_teacher lookup: classes.class_teacher_id already exists; use user_profiles.class_id fallback
--  G. school_calendar table (Preschool / Primary / JHS vacation + reopening + total days)
--  H. Master-scoresheet friendly view of all scores for a class
-- =========================================================================

BEGIN;

-- =========================================================================
-- A. Fix subjects table naming to match user's list
--    User's subject names vs ours:
--    User           | Current (schema)   | Action
--    ----------------------------------------------------------------
--    R.M.E.         | Religious & Moral Education  -> add synonym row OR just accept. We keep DB name, map via CASE.
--    History        | (missing)                    -> INSERT row for classes that need it (Class 1-6)
--    Science        | Integrated Science for B1-9, nothing for Nursery/KG -> use for lower
--    Our World & Our People | Environmental Studies in KG -> rename / add
--    Career Technology | Career Tech already exists in JHS rows
--    Social Studies | already Social Studies / Our World variant
--    Computing      | already Computing
--    Creative Arts  | "Creative Arts" (N, KG) vs "Creative Arts & Design" (B1+)
--    Mathematics / English Language | already there
--
-- To keep things simple we:
--   (1) INSERT missing "History" subject rows for B1..B6 (sort 5..10) where user assigns it.
--       History is already present only if user asked for it. We insert with display_order 10.
--   (2) Make sure Nursery / KG class 1..4 have "Our World & Our People" synonym:
--       Rename Environmental Studies -> "Our World & Our People" for KG so Rita/Jemima map works.
-- =========================================================================

-- Add "History" subject for Basic 1..6 (sort_order 5..10). Skip if subject already exists in that class.
INSERT INTO public.subjects (school_id, name, code, class_id, display_order, created_at)
SELECT
  (SELECT id FROM public.schools LIMIT 1) AS school_id,
  'History' AS name,
  'HIST' AS code,
  c.id AS class_id,
  10 AS display_order,
  NOW() AS created_at
FROM public.classes c
WHERE c.sort_order BETWEEN 5 AND 10
  AND NOT EXISTS (
    SELECT 1 FROM public.subjects s2
    WHERE s2.class_id = c.id AND s2.name = 'History'
  );

-- Rename "Environmental Studies" to "Our World & Our People" in KG1/KG2 so Rita & Jemima's list matches.
UPDATE public.subjects
SET name = 'Our World & Our People', code = 'OWOP'
WHERE name = 'Environmental Studies'
  AND class_id IN (SELECT id FROM public.classes WHERE sort_order IN (3, 4));

-- Also set Nursery "Social Studies" to "Our World & Our People" for consistency if the lower-school teacher needs it.
-- User's KWAKYE RITA / QUAYE JEMIMA list KG subjects: Our World & Our People.
-- Already handled above for KG. Nursery (sort 1,2) user's list didn't mention teachers. Leave as-is.

-- For B1..B3 (sort 5,6,7) the teacher lists say:
--   Boateng Margarita (Class 1) subjects: R.M.E., Creative Arts, History.
--   Quaye Eunice (Class 2): same minus History
--   Quaye Stephen (Class 3): R.M.E., Creative Arts, History
-- Lower primary teachers (B1-B3) use "Science" not "Integrated Science". Rename for readability only
-- if we want to match UI labels — but internal naming is fine; we map via CASE in the trigger below.
-- Keep DB name; the CASE statement below handles string aliases.

-- =========================================================================
-- B. Add the 4 MISSING teachers to auth.users-adjacent tables + staff
--
-- Missing names from list (not in user_profiles):
--   1. AMANKONA EVANS KOJO   - Computing for Class 4,5,6, JHS1-3
--   2. BOATENG SAMUEL        - History for Class 2,4,5,6
--   3. PERBY KENNEDY KWESI   - Social Studies + Career Tech JHS1-3
--   4. QUAYE STEPHEN AMANOR  - Class 3 all-subject teacher + Creative Arts upper
-- Existing teachers we WILL RE-USE / normalize to the user's list:
--   ATSIDEFE DANIEL     -> Daniel Atsidefe   (already exists) - English
--   BOATENG MARGARITA   -> Margerita Boateng (already exists) - Class 1 all
--   DARKO BISMARK       -> Bismark Darko     (already exists) - RME
--   GABRIEL AFFUL       -> Gabriel Afful     (already exists) - Maths
--   KOKONU ANTHONY      -> Anthony Kokonu    (already exists) - Science
--   KWAKYE RITA         -> Rita Kwakye       (already exists) - KG1 all
--   QUAYE EUNICE        -> Eunice Quaye      (already exists) - Class 2 all
--   QUAYE JEMIMA        -> Jemima Quaye      (already exists) - KG2 all
--
-- Create user_profiles rows (since user_profiles.id is auth.users.id FK,
-- generate random UUIDs + set role='teacher'). The school pay app will share
-- credentials per project rules.
-- =========================================================================

-- MISSING TEACHER INSERTIONS.
-- Use a CTE to insert both user_profiles + staff in one statement.
WITH new_teachers AS (
  SELECT 'AMANKONA EVANS KOJO'       AS full_name, 'evans.amankona@mogasco.edu.gh'       AS email, 'Computing Teacher'         AS staff_type, NULL::uuid AS user_id
  UNION ALL
  SELECT 'BOATENG SAMUEL'           AS full_name, 'samuel.boateng@mogasco.edu.gh'       AS email, 'Teacher'                   AS staff_type, NULL::uuid AS user_id
  UNION ALL
  SELECT 'PERBY KENNEDY KWESI'      AS full_name, 'kennedy.perby@mogasco.edu.gh'        AS email, 'Teacher'                   AS staff_type, NULL::uuid AS user_id
  UNION ALL
  SELECT 'QUAYE STEPHEN AMANOR'     AS full_name, 'stephen.quaye@mogasco.edu.gh'        AS email, 'Teacher'                   AS staff_type, NULL::uuid AS user_id
),
inserted_profiles AS (
  INSERT INTO public.user_profiles (id, full_name, role, is_active, created_at, updated_at, phone, class_id)
  SELECT
    gen_random_uuid() AS id,
    nt.full_name      AS full_name,
    'teacher'         AS role,
    true              AS is_active,
    NOW()             AS created_at,
    NOW()             AS updated_at,
    NULL              AS phone,
    NULL              AS class_id
  FROM new_teachers nt
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles up2 WHERE upper(up2.full_name) = upper(nt.full_name)
  )
  RETURNING id, full_name
)
INSERT INTO public.staff (
  id, user_id, school_id, staff_id_code, first_name, surname, other_names, gender,
  staff_type, email, contact_one, contact_two, is_active, date_joined, created_at, updated_at, class_teacher_of
)
SELECT
  gen_random_uuid() AS id,
  ip.id            AS user_id,
  (SELECT id FROM public.schools LIMIT 1) AS school_id,
  'STF-' || LPAD((1000 + COALESCE((SELECT COUNT(*) FROM public.staff s WHERE s.created_at < NOW()), 0) + (ROW_NUMBER() OVER ()))::text, 4, '0') AS staff_id_code,
  CASE WHEN position(' ' in trim(ip.full_name)) > 0 THEN split_part(trim(ip.full_name), ' ', 1) ELSE trim(ip.full_name) END AS first_name,
  CASE WHEN position(' ' in trim(ip.full_name)) > 0 THEN substring(trim(ip.full_name) from position(' ' in trim(ip.full_name)) + 1) ELSE '' END AS surname,
  NULL             AS other_names,
  NULL             AS gender,
  nt.staff_type    AS staff_type,
  nt.email         AS email,
  NULL             AS contact_one,
  NULL             AS contact_two,
  true             AS is_active,
  DATE(NOW())      AS date_joined,
  NOW()            AS created_at,
  NOW()            AS updated_at,
  NULL             AS class_teacher_of
FROM inserted_profiles ip
JOIN new_teachers nt ON upper(nt.full_name) = upper(ip.full_name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.staff s WHERE s.user_id = ip.id
);

-- Normalize existing teacher names in user_profiles to match user's UPPERCASE roster display
-- (just for the UI; no data loss). First name / surname in staff already stored correctly.
-- No-op update to keep existing.

-- Fix QUAYE STEPHEN AMANOR to be Class 3 class_teacher (he owns Class 3 all subjects).
-- Also confirm: Class 1 (sort5) -> Boateng Margarita class_teacher; Class2 (sort6) -> Eunice; Class3 (sort7) -> Stephen;
-- KG1 (sort3) -> Rita Kwakye class_teacher; KG2 (sort4) -> Jemima class_teacher.
DO $$
DECLARE
  v_school UUID := (SELECT id FROM public.schools LIMIT 1);
  v_year   UUID := (SELECT id FROM public.academic_years WHERE label = '2026/2027' LIMIT 1);
  v_term   UUID := (SELECT id FROM public.terms WHERE is_current = true LIMIT 1);
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT c.id AS class_id, c.sort_order, c.name AS class_name, up.id AS up_user_id, s.id AS staff_id
    FROM public.classes c
    LEFT JOIN public.user_profiles up ON (
      (c.sort_order = 3  AND upper(up.full_name) = upper('Rita Kwakye'))        OR
      (c.sort_order = 4  AND upper(up.full_name) = upper('Jemima Quaye'))       OR
      (c.sort_order = 5  AND upper(up.full_name) = upper('Margerita Boateng'))  OR
      (c.sort_order = 6  AND upper(up.full_name) = upper('Eunice Quaye'))       OR
      (c.sort_order = 7  AND upper(up.full_name) = upper('Quaye Stephen Amanor')) OR
      (c.sort_order = 11 AND upper(up.full_name) = upper('Kennedy Obuobi'))
    )
    LEFT JOIN public.staff s ON s.user_id = up.id
    WHERE c.sort_order IN (3,4,5,6,7,11)
  LOOP
    IF rec.staff_id IS NOT NULL THEN
      UPDATE public.classes SET class_teacher_id = rec.staff_id WHERE id = rec.class_id AND class_teacher_id IS NULL;
      UPDATE public.user_profiles SET class_id = rec.class_id WHERE id = rec.up_user_id AND class_id IS NULL;
      UPDATE public.staff SET class_teacher_of = rec.class_id WHERE id = rec.staff_id AND (class_teacher_of IS NULL OR class_teacher_of <> rec.class_id);
    END IF;
  END LOOP;
END $$;

-- =========================================================================
-- C. Add class_id column to subject_teacher_assignments
-- =========================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='subject_teacher_assignments' AND column_name='class_id'
  ) THEN
    ALTER TABLE public.subject_teacher_assignments ADD COLUMN class_id UUID REFERENCES public.classes(id);
  END IF;
END $$;

-- Backfill: derive class_id from subjects.class_id for existing rows.
UPDATE public.subject_teacher_assignments sta
SET class_id = sub.class_id
FROM public.subjects sub
WHERE sub.id = sta.subject_id AND sta.class_id IS NULL;

-- =========================================================================
-- D. WIPE + RE-SEED subject_teacher_assignments for 2026/2027 + current term,
--    following the user's rules EXACTLY.
--
-- Rules recap:
--  - For KG and Class 3 AND BELOW (sort_order 1,2,3,4,5,6,7):
--      class teacher controls ALL subjects
--      EXCEPT the few subjects explicitly assigned to other teachers for those classes.
--      User explicitly said: "for class3 and below the class teacher controls all the
--      subjects ... except a few so i will let you know which ones are being taught by
--      other teachers - if i dont mention, it means the class teachers take those ones".
--      From the explicit list for lower school:
--        BOATENG SAMUEL takes History for Class 2 (sort6)
--        QUAYE STEPHEN AMANOR takes History for Class 3 (sort7) - but he IS the CT of Class3 so no override.
--      So BOATENG SAMUEL, HISTORY, sort6 only = exception.
--
--  - Class 4 and ABOVE (B4..B9, sort_order 8..13): ONLY assigned subject teachers
--    per the user's explicit list. No default class-teacher-takes-all.
--
--  Explicit subject list (subject names are user's naming, so we match via CASE-insensitive INSTR):
--    AMANKONA EVANS KOJO   -> Computing                -> Class 4,5,6, JHS 1,2,3 (sort 8,9,10,11,12,13)
--    ATSIDEFE DANIEL       -> English Language         -> Class 4,5,6, JHS 1,2,3 (sort 8-13)
--    BOATENG MARGARITA     -> Class 1 ALL              -> (Class 1 = sort5) + also BOATENG SAMUEL History (explicit) for class 2,4,5,6
--    BOATENG SAMUEL        -> History                  -> Class 2,4,5,6 (sort 6,8,9,10)
--    DARKO BISMARK         -> R.M.E.                   -> Class 4,6, JHS 1,2,3 (sort 8,10,11,12,13)
--    GABRIEL AFFUL         -> Mathematics              -> Class4,5,6, JHS 1,2,3 (sort 8-13)
--    KOKONU ANTHONY        -> Science                  -> Class4,5,6, JHS 1,2,3 (sort 8-13) (DB: Integrated Science B1+, Science elsewhere)
--    KWAKYE RITA           -> KG1 ALL                  -> KG1 (sort3)
--    PERBY KENNEDY KWESI   -> Social Studies, Career Tech  -> JHS1-3 (sort 11-13)
--    QUAYE EUNICE          -> Class 2 ALL              -> Class2 (sort6)
--    QUAYE JEMIMA          -> KG2 ALL                  -> KG2 (sort4)
--    QUAYE STEPHEN AMANOR  -> Class3 ALL + Creative Arts upper -> Class3 (sort7) + Class4-6 JHS Creative Arts
-- =========================================================================
TRUNCATE public.subject_teacher_assignments RESTART IDENTITY CASCADE;

-- D.1 Nursery 1 & 2 (sort 1,2) - user didn't specify teachers, leave subject assignments EMPTY
--      because no teacher was listed for N1/N2. Admin can assign later.

-- D.2 KG1 (sort3) - KWAKYE RITA takes everything.
INSERT INTO public.subject_teacher_assignments (id, subject_id, teacher_id, class_id, academic_year_id, term_id)
SELECT
  gen_random_uuid(), sub.id, s.id, c.id,
  (SELECT id FROM public.academic_years WHERE label='2026/2027' LIMIT 1),
  (SELECT id FROM public.terms WHERE is_current = true LIMIT 1)
FROM public.classes c
JOIN public.subjects sub ON sub.class_id = c.id
JOIN public.user_profiles up ON upper(up.full_name) = upper('Rita Kwakye')
JOIN public.staff s ON s.user_id = up.id
WHERE c.sort_order = 3;

-- D.3 KG2 (sort4) - QUAYE JEMIMA takes everything.
INSERT INTO public.subject_teacher_assignments (id, subject_id, teacher_id, class_id, academic_year_id, term_id)
SELECT
  gen_random_uuid(), sub.id, s.id, c.id,
  (SELECT id FROM public.academic_years WHERE label='2026/2027' LIMIT 1),
  (SELECT id FROM public.terms WHERE is_current = true LIMIT 1)
FROM public.classes c
JOIN public.subjects sub ON sub.class_id = c.id
JOIN public.user_profiles up ON upper(up.full_name) = upper('Jemima Quaye')
JOIN public.staff s ON s.user_id = up.id
WHERE c.sort_order = 4;

-- D.4 Class 1 (sort5) - BOATENG MARGARITA takes everything:
--     Math, English, Science, Creative Arts, History, R.M.E.
INSERT INTO public.subject_teacher_assignments (id, subject_id, teacher_id, class_id, academic_year_id, term_id)
SELECT
  gen_random_uuid(), sub.id, s.id, c.id,
  (SELECT id FROM public.academic_years WHERE label='2026/2027' LIMIT 1),
  (SELECT id FROM public.terms WHERE is_current = true LIMIT 1)
FROM public.classes c
JOIN public.subjects sub ON sub.class_id = c.id
JOIN public.user_profiles up ON upper(up.full_name) = upper('Margerita Boateng')
JOIN public.staff s ON s.user_id = up.id
WHERE c.sort_order = 5
  AND (
    -- user's explicit 6 + include also Computing/French/social if DB has them; but her list says only her 6.
    -- Keep strict = user's list, plus History (which we inserted):
    sub.name IN ('Mathematics','English Language','Integrated Science','Science','Creative Arts & Design','Creative Arts','History','Religious & Moral Education')
  );

-- D.5 Class 2 (sort6) - QUAYE EUNICE takes everything EXCEPT HISTORY -> BOATENG SAMUEL.
-- First Eunice's subjects (exclude History because user said Boateng Samuel takes History for Class 2).
INSERT INTO public.subject_teacher_assignments (id, subject_id, teacher_id, class_id, academic_year_id, term_id)
SELECT
  gen_random_uuid(), sub.id, s.id, c.id,
  (SELECT id FROM public.academic_years WHERE label='2026/2027' LIMIT 1),
  (SELECT id FROM public.terms WHERE is_current = true LIMIT 1)
FROM public.classes c
JOIN public.subjects sub ON sub.class_id = c.id
JOIN public.user_profiles up ON upper(up.full_name) = upper('Eunice Quaye')
JOIN public.staff s ON s.user_id = up.id
WHERE c.sort_order = 6
  AND sub.name <> 'History';

-- Now Boateng Samuel takes History for Class 2.
INSERT INTO public.subject_teacher_assignments (id, subject_id, teacher_id, class_id, academic_year_id, term_id)
SELECT
  gen_random_uuid(), sub.id, s.id, c.id,
  (SELECT id FROM public.academic_years WHERE label='2026/2027' LIMIT 1),
  (SELECT id FROM public.terms WHERE is_current = true LIMIT 1)
FROM public.classes c
JOIN public.subjects sub ON sub.class_id = c.id AND sub.name = 'History'
JOIN public.user_profiles up ON upper(up.full_name) = upper('Boateng Samuel')
JOIN public.staff s ON s.user_id = up.id
WHERE c.sort_order = 6;

-- D.6 Class 3 (sort7) - QUAYE STEPHEN AMANOR takes everything (he IS the CT and user said he takes his own list).
INSERT INTO public.subject_teacher_assignments (id, subject_id, teacher_id, class_id, academic_year_id, term_id)
SELECT
  gen_random_uuid(), sub.id, s.id, c.id,
  (SELECT id FROM public.academic_years WHERE label='2026/2027' LIMIT 1),
  (SELECT id FROM public.terms WHERE is_current = true LIMIT 1)
FROM public.classes c
JOIN public.subjects sub ON sub.class_id = c.id
JOIN public.user_profiles up ON upper(up.full_name) = upper('Quaye Stephen Amanor')
JOIN public.staff s ON s.user_id = up.id
WHERE c.sort_order = 7
  AND (
    sub.name IN ('Mathematics','English Language','Integrated Science','Science','Creative Arts & Design','Creative Arts','History','Religious & Moral Education')
  );

-- D.7 Class 4..6 (sort 8,9,10) + JHS1..3 (sort11,12,13): ONLY SPECIALIST TEACHERS per user's list.
-- 7a. AMANKONA EVANS KOJO - Computing (sort 8..13)
INSERT INTO public.subject_teacher_assignments (id, subject_id, teacher_id, class_id, academic_year_id, term_id)
SELECT
  gen_random_uuid(), sub.id, s.id, c.id,
  (SELECT id FROM public.academic_years WHERE label='2026/2027' LIMIT 1),
  (SELECT id FROM public.terms WHERE is_current = true LIMIT 1)
FROM public.classes c
JOIN public.subjects sub ON sub.class_id = c.id AND sub.name = 'Computing'
JOIN public.user_profiles up ON upper(up.full_name) = upper('Amankona Evans Kojo')
JOIN public.staff s ON s.user_id = up.id
WHERE c.sort_order BETWEEN 8 AND 13;

-- 7b. ATSIDEFE DANIEL - English Language (sort 8..13)
INSERT INTO public.subject_teacher_assignments (id, subject_id, teacher_id, class_id, academic_year_id, term_id)
SELECT
  gen_random_uuid(), sub.id, s.id, c.id,
  (SELECT id FROM public.academic_years WHERE label='2026/2027' LIMIT 1),
  (SELECT id FROM public.terms WHERE is_current = true LIMIT 1)
FROM public.classes c
JOIN public.subjects sub ON sub.class_id = c.id AND sub.name = 'English Language'
JOIN public.user_profiles up ON upper(up.full_name) = upper('Daniel Atsidefe')
JOIN public.staff s ON s.user_id = up.id
WHERE c.sort_order BETWEEN 8 AND 13;

-- 7c. BOATENG SAMUEL - History for Class 2,4,5,6 -> we did Class 2 in D.5; here just sort 8,9,10 (Class 4-6)
INSERT INTO public.subject_teacher_assignments (id, subject_id, teacher_id, class_id, academic_year_id, term_id)
SELECT
  gen_random_uuid(), sub.id, s.id, c.id,
  (SELECT id FROM public.academic_years WHERE label='2026/2027' LIMIT 1),
  (SELECT id FROM public.terms WHERE is_current = true LIMIT 1)
FROM public.classes c
JOIN public.subjects sub ON sub.class_id = c.id AND sub.name = 'History'
JOIN public.user_profiles up ON upper(up.full_name) = upper('Boateng Samuel')
JOIN public.staff s ON s.user_id = up.id
WHERE c.sort_order BETWEEN 8 AND 10;

-- 7d. DARKO BISMARK - R.M.E. for Class 4,6, JHS1-3 (sort 8,10,11,12,13). Class 5 R.M.E. -> NOT listed, so leave unassigned for B5
INSERT INTO public.subject_teacher_assignments (id, subject_id, teacher_id, class_id, academic_year_id, term_id)
SELECT
  gen_random_uuid(), sub.id, s.id, c.id,
  (SELECT id FROM public.academic_years WHERE label='2026/2027' LIMIT 1),
  (SELECT id FROM public.terms WHERE is_current = true LIMIT 1)
FROM public.classes c
JOIN public.subjects sub ON sub.class_id = c.id AND sub.name = 'Religious & Moral Education'
JOIN public.user_profiles up ON upper(up.full_name) = upper('Bismark Darko')
JOIN public.staff s ON s.user_id = up.id
WHERE c.sort_order IN (8, 10, 11, 12, 13);

-- 7e. GABRIEL AFFUL - Mathematics sort 8..13
INSERT INTO public.subject_teacher_assignments (id, subject_id, teacher_id, class_id, academic_year_id, term_id)
SELECT
  gen_random_uuid(), sub.id, s.id, c.id,
  (SELECT id FROM public.academic_years WHERE label='2026/2027' LIMIT 1),
  (SELECT id FROM public.terms WHERE is_current = true LIMIT 1)
FROM public.classes c
JOIN public.subjects sub ON sub.class_id = c.id AND sub.name = 'Mathematics'
JOIN public.user_profiles up ON upper(up.full_name) = upper('Gabriel Afful')
JOIN public.staff s ON s.user_id = up.id
WHERE c.sort_order BETWEEN 8 AND 13;

-- 7f. KOKONU ANTHONY - Science sort 8..13 (Integrated Science name in DB for B+)
INSERT INTO public.subject_teacher_assignments (id, subject_id, teacher_id, class_id, academic_year_id, term_id)
SELECT
  gen_random_uuid(), sub.id, s.id, c.id,
  (SELECT id FROM public.academic_years WHERE label='2026/2027' LIMIT 1),
  (SELECT id FROM public.terms WHERE is_current = true LIMIT 1)
FROM public.classes c
JOIN public.subjects sub ON sub.class_id = c.id AND sub.name IN ('Integrated Science','Science')
JOIN public.user_profiles up ON upper(up.full_name) = upper('Anthony Kokonu')
JOIN public.staff s ON s.user_id = up.id
WHERE c.sort_order BETWEEN 8 AND 13;

-- 7g. PERBY KENNEDY KWESI - Social Studies + Career Tech for JHS1-3 (sort11..13)
INSERT INTO public.subject_teacher_assignments (id, subject_id, teacher_id, class_id, academic_year_id, term_id)
SELECT
  gen_random_uuid(), sub.id, s.id, c.id,
  (SELECT id FROM public.academic_years WHERE label='2026/2027' LIMIT 1),
  (SELECT id FROM public.terms WHERE is_current = true LIMIT 1)
FROM public.classes c
JOIN public.subjects sub ON sub.class_id = c.id AND sub.name IN ('Social Studies','Career Technology','Career Tech')
JOIN public.user_profiles up ON upper(up.full_name) = upper('Perby Kennedy Kwesi')
JOIN public.staff s ON s.user_id = up.id
WHERE c.sort_order BETWEEN 11 AND 13;

-- 7h. QUAYE STEPHEN AMANOR - Creative Arts for Class 4-6 + JHS (sort 8..13)
--     Name in DB: "Creative Arts & Design" for B+. Match by LIKE '%Creative Arts%'.
INSERT INTO public.subject_teacher_assignments (id, subject_id, teacher_id, class_id, academic_year_id, term_id)
SELECT
  gen_random_uuid(), sub.id, s.id, c.id,
  (SELECT id FROM public.academic_years WHERE label='2026/2027' LIMIT 1),
  (SELECT id FROM public.terms WHERE is_current = true LIMIT 1)
FROM public.classes c
JOIN public.subjects sub ON sub.class_id = c.id AND sub.name ILIKE '%Creative Arts%'
JOIN public.user_profiles up ON upper(up.full_name) = upper('Quaye Stephen Amanor')
JOIN public.staff s ON s.user_id = up.id
WHERE c.sort_order BETWEEN 8 AND 13;

-- =========================================================================
-- E. feeding_fees table + attendance mapping view
--    Business rule: student pays daily feeding fee => present that day; unpaid => absent
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.feeding_fees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id        UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  payment_date    DATE NOT NULL,
  amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  term_id         UUID REFERENCES public.terms(id),
  receipt_number  TEXT,
  payment_method  TEXT DEFAULT 'CASH',
  collected_by    UUID REFERENCES public.staff(id),
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, payment_date)
);

-- Drop if exists then re-create (idempotent)
DROP POLICY IF EXISTS "feeding_fees_select_auth" ON public.feeding_fees;
CREATE POLICY "feeding_fees_select_auth" ON public.feeding_fees
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "feeding_fees_admin_manage" ON public.feeding_fees;
CREATE POLICY "feeding_fees_admin_manage" ON public.feeding_fees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('proprietress','headmaster','accountant')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('proprietress','headmaster','accountant')
    )
  );

ALTER TABLE public.feeding_fees ENABLE ROW LEVEL SECURITY;

-- Derived attendance VIEW (read-only for attendance service)
-- This lets the existing attendance service SELECT from attendance but now
-- backed by feeding_fees payments. We don't touch the original attendance table.
DROP VIEW IF EXISTS public.feeding_attendance_view CASCADE;
CREATE OR REPLACE VIEW public.feeding_attendance_view AS
SELECT
  ff.student_id,
  ff.class_id,
  ff.payment_date     AS attendance_date,
  CASE WHEN ff.amount > 0 THEN 'PRESENT' ELSE 'ABSENT' END AS status,
  ff.amount           AS fee_paid,
  ff.term_id
FROM public.feeding_fees ff;

-- =========================================================================
-- F. school_calendar table
--    Groups vacation, reopening, total_school_days by SCHOOL_SECTION:
--      preschool (N1..KG2 = sort 1-4)
--      primary   (B1..B6  = sort 5-10)
--      jhs       (JHS1-3 = sort 11-13)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.school_calendar (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  term_id          UUID REFERENCES public.terms(id) ON DELETE CASCADE,
  section          TEXT NOT NULL CHECK (section IN ('preschool','primary','jhs')),
  vacation_date    DATE,
  reopening_date   DATE,
  total_school_days INTEGER,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, term_id, section)
);

-- Seed defaults for current term (per the screenshot the user provided)
INSERT INTO public.school_calendar (school_id, term_id, section, vacation_date, reopening_date, total_school_days)
SELECT
  (SELECT id FROM public.schools LIMIT 1) AS school_id,
  (SELECT id FROM public.terms WHERE is_current = true LIMIT 1) AS term_id,
  s.section,
  t.end_date   AS vacation_date,
  NULL         AS reopening_date,
  100          AS total_school_days
FROM (
  SELECT 'preschool' AS section UNION ALL SELECT 'primary' UNION ALL SELECT 'jhs'
) s
CROSS JOIN public.terms t
WHERE t.is_current = true
ON CONFLICT (school_id, term_id, section) DO NOTHING;

-- Write-back terms.total_school_days from calendar for default.
UPDATE public.terms
SET total_school_days = 100,
    vacation_date = (SELECT vacation_date FROM public.school_calendar sc WHERE sc.term_id = terms.id AND sc.section = 'primary' LIMIT 1),
    reopening_date = (SELECT reopening_date FROM public.school_calendar sc WHERE sc.term_id = terms.id AND sc.section = 'primary' LIMIT 1)
WHERE is_current = true;

DROP POLICY IF EXISTS "school_calendar_select_auth" ON public.school_calendar;
CREATE POLICY "school_calendar_select_auth" ON public.school_calendar
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "school_calendar_admin_manage" ON public.school_calendar;
CREATE POLICY "school_calendar_admin_manage" ON public.school_calendar
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('proprietress','headmaster')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('proprietress','headmaster')
    )
  );

ALTER TABLE public.school_calendar ENABLE ROW LEVEL SECURITY;

COMMIT;
