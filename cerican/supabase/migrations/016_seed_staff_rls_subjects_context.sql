-- =========================================================================
-- 016 - Fix "no profiles" issue + seed dashboard data for Teacher/Admin portals
-- Schema source of truth: migrations 001 & 007
-- =========================================================================

-- =========================================================================
-- PART 1 - RLS POLICIES (staff & guardians)
-- Without these, RLS-enabled tables return 0 rows for authenticated users
-- =========================================================================

-- STAFF: any authenticated user can read staff rows (needed for lookups)
DROP POLICY IF EXISTS "staff_select_authenticated" ON public.staff;
CREATE POLICY "staff_select_authenticated" ON public.staff
  FOR SELECT USING (auth.role() = 'authenticated');

-- STAFF: admins can manage (insert/update/delete)
DROP POLICY IF EXISTS "staff_admin_manage" ON public.staff;
CREATE POLICY "staff_admin_manage" ON public.staff
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('proprietress', 'headmaster', 'accountant')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('proprietress', 'headmaster', 'accountant')
    )
  );

-- STAFF: a staff member always reads their own row
DROP POLICY IF EXISTS "staff_read_own" ON public.staff;
CREATE POLICY "staff_read_own" ON public.staff
  FOR SELECT USING (user_id = auth.uid());

-- GUARDIANS: any authenticated can read
DROP POLICY IF EXISTS "guardians_select_authenticated" ON public.guardians;
CREATE POLICY "guardians_select_authenticated" ON public.guardians
  FOR SELECT USING (auth.role() = 'authenticated');

-- GUARDIANS: admins can manage
DROP POLICY IF EXISTS "guardians_admin_manage" ON public.guardians;
CREATE POLICY "guardians_admin_manage" ON public.guardians
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('proprietress', 'headmaster', 'accountant')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('proprietress', 'headmaster', 'accountant')
    )
  );

-- USER_PROFILES: authenticated users can read this (fallback layer)
DROP POLICY IF EXISTS "user_profiles_select_authenticated" ON public.user_profiles;
CREATE POLICY "user_profiles_select_authenticated" ON public.user_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- SUBJECTS: authenticated can read
DROP POLICY IF EXISTS "subjects_select_authenticated" ON public.subjects;
CREATE POLICY "subjects_select_authenticated" ON public.subjects
  FOR SELECT USING (auth.role() = 'authenticated');

-- SUBJECT_TEACHER_ASSIGNMENTS: authenticated can read
DROP POLICY IF EXISTS "sta_select_authenticated" ON public.subject_teacher_assignments;
CREATE POLICY "sta_select_authenticated" ON public.subject_teacher_assignments
  FOR SELECT USING (auth.role() = 'authenticated');

-- CLASSES: authenticated can read
DROP POLICY IF EXISTS "classes_select_authenticated" ON public.classes;
CREATE POLICY "classes_select_authenticated" ON public.classes
  FOR SELECT USING (auth.role() = 'authenticated');

-- SCHOOL_CURRENT_CONTEXT: authenticated can read
DROP POLICY IF EXISTS "scc_select_authenticated" ON public.school_current_context;
CREATE POLICY "scc_select_authenticated" ON public.school_current_context
  FOR SELECT USING (auth.role() = 'authenticated');

-- ACADEMIC_YEARS: authenticated can read
DROP POLICY IF EXISTS "ay_select_authenticated" ON public.academic_years;
CREATE POLICY "ay_select_authenticated" ON public.academic_years
  FOR SELECT USING (auth.role() = 'authenticated');

-- TERMS: authenticated can read
DROP POLICY IF EXISTS "terms_select_authenticated" ON public.terms;
CREATE POLICY "terms_select_authenticated" ON public.terms
  FOR SELECT USING (auth.role() = 'authenticated');

-- STUDENTS: authenticated can read (roster, dashboard counts)
DROP POLICY IF EXISTS "students_select_authenticated" ON public.students;
CREATE POLICY "students_select_authenticated" ON public.students
  FOR SELECT USING (auth.role() = 'authenticated');

-- SCORESHEET_SUBMISSIONS: authenticated can read
DROP POLICY IF EXISTS "ss_select_authenticated" ON public.scoresheet_submissions;
CREATE POLICY "ss_select_authenticated" ON public.scoresheet_submissions
  FOR SELECT USING (auth.role() = 'authenticated');

-- SCORES: authenticated can read
DROP POLICY IF EXISTS "scores_select_authenticated" ON public.scores;
CREATE POLICY "scores_select_authenticated" ON public.scores
  FOR SELECT USING (auth.role() = 'authenticated');

-- =========================================================================
-- PART 1b - Ensure schools has at least one row, insert default if empty
-- =========================================================================

INSERT INTO public.schools (id, name, code, created_at)
SELECT gen_random_uuid(), 'Morning Glory Academy', 'MOGASCO01', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.schools);

-- =========================================================================
-- PART 1c - Ensure academic year "2026/2027" exists (matches term starting Sep 2026)
-- =========================================================================

INSERT INTO public.academic_years (id, school_id, label, start_date, end_date, created_at)
SELECT
  gen_random_uuid(),
  (SELECT id FROM public.schools LIMIT 1),
  '2026/2027',
  '2026-09-01',
  '2027-08-31',
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.academic_years WHERE label = '2026/2027');

-- =========================================================================
-- PART 2 - Seed staff table FROM user_profiles + auth.users
-- user_profiles.id == auth.users.id (FK enforced), so staff.user_id = up.id
-- =========================================================================

INSERT INTO public.staff (
  id,
  user_id,
  school_id,
  staff_id_code,
  first_name,
  surname,
  other_names,
  gender,
  staff_type,
  email,
  contact_one,
  contact_two,
  is_active,
  date_joined,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid()                                           AS id,
  up.id                                                       AS user_id,
  (SELECT id FROM public.schools LIMIT 1)                    AS school_id,
  'STF-' || LPAD((ROW_NUMBER() OVER (ORDER BY up.created_at))::text, 4, '0') AS staff_id_code,
  CASE
    WHEN position(' ' in trim(up.full_name)) > 0
    THEN split_part(trim(up.full_name), ' ', 1)
    ELSE trim(up.full_name)
  END                                                         AS first_name,
  CASE
    WHEN position(' ' in trim(up.full_name)) > 0
    THEN substring(trim(up.full_name) from position(' ' in trim(up.full_name)) + 1)
    ELSE ''
  END                                                         AS surname,
  NULL                                                        AS other_names,
  NULL                                                        AS gender,
  CASE up.role
    WHEN 'proprietress' THEN 'Admin'
    WHEN 'headmaster'   THEN 'Head Teacher'
    WHEN 'accountant'   THEN 'Accountant'
    WHEN 'teacher'      THEN 'Teacher'
    ELSE 'Teacher'
  END                                                         AS staff_type,
  u.email                                                     AS email,
  up.phone                                                    AS contact_one,
  NULL                                                        AS contact_two,
  COALESCE(up.is_active, true)                                AS is_active,
  DATE(up.created_at)                                         AS date_joined,
  COALESCE(up.created_at, NOW())                              AS created_at,
  COALESCE(up.updated_at, NOW())                              AS updated_at
FROM public.user_profiles up
LEFT JOIN auth.users u ON u.id = up.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.staff s WHERE s.user_id = up.id
);

-- =========================================================================
-- PART 3 - classes.class_teacher_id from user_profiles.class_id + staff linkage
-- =========================================================================

UPDATE public.classes c
SET class_teacher_id = s.id
FROM public.user_profiles up
JOIN public.staff s ON s.user_id = up.id
WHERE up.class_id = c.id
  AND up.role = 'teacher'
  AND c.class_teacher_id IS NULL;

-- classes.max_students default
UPDATE public.classes SET max_students = 35 WHERE max_students IS NULL;

-- =========================================================================
-- PART 4 - Seed subjects (13 classes x standard Ghana curriculum)
-- subjects table: id, school_id, name, code, class_id, display_order, created_at
-- =========================================================================

INSERT INTO public.subjects (school_id, name, code, class_id, display_order, created_at)
-- Nursery 1 (sort_order 1)
SELECT (SELECT id FROM public.schools LIMIT 1), 'English Language',      'ENG',    (SELECT id FROM public.classes WHERE sort_order = 1), 1, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Mathematics',           'MATH',   (SELECT id FROM public.classes WHERE sort_order = 1), 2, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Creative Arts',         'ART',    (SELECT id FROM public.classes WHERE sort_order = 1), 3, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Social Studies',        'SOC',    (SELECT id FROM public.classes WHERE sort_order = 1), 4, NOW()
UNION ALL
-- Nursery 2 (sort_order 2)
SELECT (SELECT id FROM public.schools LIMIT 1), 'English Language',      'ENG',    (SELECT id FROM public.classes WHERE sort_order = 2), 1, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Mathematics',           'MATH',   (SELECT id FROM public.classes WHERE sort_order = 2), 2, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Creative Arts',         'ART',    (SELECT id FROM public.classes WHERE sort_order = 2), 3, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Social Studies',        'SOC',    (SELECT id FROM public.classes WHERE sort_order = 2), 4, NOW()
UNION ALL
-- KG 1 (sort_order 3)
SELECT (SELECT id FROM public.schools LIMIT 1), 'English Language',      'ENG',    (SELECT id FROM public.classes WHERE sort_order = 3), 1, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Mathematics',           'MATH',   (SELECT id FROM public.classes WHERE sort_order = 3), 2, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Creative Arts',         'ART',    (SELECT id FROM public.classes WHERE sort_order = 3), 3, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Environmental Studies', 'ENV',    (SELECT id FROM public.classes WHERE sort_order = 3), 4, NOW()
UNION ALL
-- KG 2 (sort_order 4)
SELECT (SELECT id FROM public.schools LIMIT 1), 'English Language',      'ENG',    (SELECT id FROM public.classes WHERE sort_order = 4), 1, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Mathematics',           'MATH',   (SELECT id FROM public.classes WHERE sort_order = 4), 2, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Creative Arts',         'ART',    (SELECT id FROM public.classes WHERE sort_order = 4), 3, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Environmental Studies', 'ENV',    (SELECT id FROM public.classes WHERE sort_order = 4), 4, NOW()
UNION ALL
-- B1 (sort_order 5)
SELECT (SELECT id FROM public.schools LIMIT 1), 'English Language',           'ENG',   (SELECT id FROM public.classes WHERE sort_order = 5), 1, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Mathematics',                'MATH',  (SELECT id FROM public.classes WHERE sort_order = 5), 2, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Integrated Science',         'SCI',   (SELECT id FROM public.classes WHERE sort_order = 5), 3, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Social Studies',             'SOC',   (SELECT id FROM public.classes WHERE sort_order = 5), 4, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Creative Arts & Design',     'CAD',   (SELECT id FROM public.classes WHERE sort_order = 5), 5, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Computing',                  'COMP',  (SELECT id FROM public.classes WHERE sort_order = 5), 6, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'French',                     'FRE',   (SELECT id FROM public.classes WHERE sort_order = 5), 7, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Religious & Moral Education','RME',   (SELECT id FROM public.classes WHERE sort_order = 5), 8, NOW()
UNION ALL
-- B2 (sort_order 6)
SELECT (SELECT id FROM public.schools LIMIT 1), 'English Language',           'ENG',   (SELECT id FROM public.classes WHERE sort_order = 6), 1, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Mathematics',                'MATH',  (SELECT id FROM public.classes WHERE sort_order = 6), 2, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Integrated Science',         'SCI',   (SELECT id FROM public.classes WHERE sort_order = 6), 3, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Social Studies',             'SOC',   (SELECT id FROM public.classes WHERE sort_order = 6), 4, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Creative Arts & Design',     'CAD',   (SELECT id FROM public.classes WHERE sort_order = 6), 5, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Computing',                  'COMP',  (SELECT id FROM public.classes WHERE sort_order = 6), 6, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'French',                     'FRE',   (SELECT id FROM public.classes WHERE sort_order = 6), 7, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Religious & Moral Education','RME',   (SELECT id FROM public.classes WHERE sort_order = 6), 8, NOW()
UNION ALL
-- B3 (sort_order 7)
SELECT (SELECT id FROM public.schools LIMIT 1), 'English Language',           'ENG',   (SELECT id FROM public.classes WHERE sort_order = 7), 1, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Mathematics',                'MATH',  (SELECT id FROM public.classes WHERE sort_order = 7), 2, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Integrated Science',         'SCI',   (SELECT id FROM public.classes WHERE sort_order = 7), 3, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Social Studies',             'SOC',   (SELECT id FROM public.classes WHERE sort_order = 7), 4, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Creative Arts & Design',     'CAD',   (SELECT id FROM public.classes WHERE sort_order = 7), 5, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Computing',                  'COMP',  (SELECT id FROM public.classes WHERE sort_order = 7), 6, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'French',                     'FRE',   (SELECT id FROM public.classes WHERE sort_order = 7), 7, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Religious & Moral Education','RME',   (SELECT id FROM public.classes WHERE sort_order = 7), 8, NOW()
UNION ALL
-- B4 (sort_order 8)
SELECT (SELECT id FROM public.schools LIMIT 1), 'English Language',           'ENG',   (SELECT id FROM public.classes WHERE sort_order = 8), 1, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Mathematics',                'MATH',  (SELECT id FROM public.classes WHERE sort_order = 8), 2, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Integrated Science',         'SCI',   (SELECT id FROM public.classes WHERE sort_order = 8), 3, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Social Studies',             'SOC',   (SELECT id FROM public.classes WHERE sort_order = 8), 4, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Creative Arts & Design',     'CAD',   (SELECT id FROM public.classes WHERE sort_order = 8), 5, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Computing',                  'COMP',  (SELECT id FROM public.classes WHERE sort_order = 8), 6, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'French',                     'FRE',   (SELECT id FROM public.classes WHERE sort_order = 8), 7, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Religious & Moral Education','RME',   (SELECT id FROM public.classes WHERE sort_order = 8), 8, NOW()
UNION ALL
-- B5 (sort_order 9)
SELECT (SELECT id FROM public.schools LIMIT 1), 'English Language',           'ENG',   (SELECT id FROM public.classes WHERE sort_order = 9), 1, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Mathematics',                'MATH',  (SELECT id FROM public.classes WHERE sort_order = 9), 2, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Integrated Science',         'SCI',   (SELECT id FROM public.classes WHERE sort_order = 9), 3, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Social Studies',             'SOC',   (SELECT id FROM public.classes WHERE sort_order = 9), 4, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Creative Arts & Design',     'CAD',   (SELECT id FROM public.classes WHERE sort_order = 9), 5, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Computing',                  'COMP',  (SELECT id FROM public.classes WHERE sort_order = 9), 6, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'French',                     'FRE',   (SELECT id FROM public.classes WHERE sort_order = 9), 7, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Religious & Moral Education','RME',   (SELECT id FROM public.classes WHERE sort_order = 9), 8, NOW()
UNION ALL
-- B6 (sort_order 10)
SELECT (SELECT id FROM public.schools LIMIT 1), 'English Language',           'ENG',   (SELECT id FROM public.classes WHERE sort_order = 10), 1, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Mathematics',                'MATH',  (SELECT id FROM public.classes WHERE sort_order = 10), 2, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Integrated Science',         'SCI',   (SELECT id FROM public.classes WHERE sort_order = 10), 3, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Social Studies',             'SOC',   (SELECT id FROM public.classes WHERE sort_order = 10), 4, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Creative Arts & Design',     'CAD',   (SELECT id FROM public.classes WHERE sort_order = 10), 5, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Computing',                  'COMP',  (SELECT id FROM public.classes WHERE sort_order = 10), 6, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'French',                     'FRE',   (SELECT id FROM public.classes WHERE sort_order = 10), 7, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Religious & Moral Education','RME',   (SELECT id FROM public.classes WHERE sort_order = 10), 8, NOW()
UNION ALL
-- B7 (sort_order 11) - JHS 1
SELECT (SELECT id FROM public.schools LIMIT 1), 'English Language',           'ENG',   (SELECT id FROM public.classes WHERE sort_order = 11), 1, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Core Mathematics',           'MATH',  (SELECT id FROM public.classes WHERE sort_order = 11), 2, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Integrated Science',         'SCI',   (SELECT id FROM public.classes WHERE sort_order = 11), 3, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Social Studies',             'SOC',   (SELECT id FROM public.classes WHERE sort_order = 11), 4, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Religious & Moral Education','RME',   (SELECT id FROM public.classes WHERE sort_order = 11), 5, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'French',                     'FRE',   (SELECT id FROM public.classes WHERE sort_order = 11), 6, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Computing',                  'COMP',  (SELECT id FROM public.classes WHERE sort_order = 11), 7, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Creative Arts & Design',     'CAD',   (SELECT id FROM public.classes WHERE sort_order = 11), 8, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Career Technology',          'CTECH', (SELECT id FROM public.classes WHERE sort_order = 11), 9, NOW()
UNION ALL
-- B8 (sort_order 12) - JHS 2
SELECT (SELECT id FROM public.schools LIMIT 1), 'English Language',           'ENG',   (SELECT id FROM public.classes WHERE sort_order = 12), 1, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Core Mathematics',           'MATH',  (SELECT id FROM public.classes WHERE sort_order = 12), 2, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Integrated Science',         'SCI',   (SELECT id FROM public.classes WHERE sort_order = 12), 3, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Social Studies',             'SOC',   (SELECT id FROM public.classes WHERE sort_order = 12), 4, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Religious & Moral Education','RME',   (SELECT id FROM public.classes WHERE sort_order = 12), 5, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'French',                     'FRE',   (SELECT id FROM public.classes WHERE sort_order = 12), 6, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Computing',                  'COMP',  (SELECT id FROM public.classes WHERE sort_order = 12), 7, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Creative Arts & Design',     'CAD',   (SELECT id FROM public.classes WHERE sort_order = 12), 8, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Career Technology',          'CTECH', (SELECT id FROM public.classes WHERE sort_order = 12), 9, NOW()
UNION ALL
-- B9 (sort_order 13) - JHS 3
SELECT (SELECT id FROM public.schools LIMIT 1), 'English Language',           'ENG',   (SELECT id FROM public.classes WHERE sort_order = 13), 1, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Core Mathematics',           'MATH',  (SELECT id FROM public.classes WHERE sort_order = 13), 2, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Integrated Science',         'SCI',   (SELECT id FROM public.classes WHERE sort_order = 13), 3, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Social Studies',             'SOC',   (SELECT id FROM public.classes WHERE sort_order = 13), 4, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Religious & Moral Education','RME',   (SELECT id FROM public.classes WHERE sort_order = 13), 5, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'French',                     'FRE',   (SELECT id FROM public.classes WHERE sort_order = 13), 6, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Computing',                  'COMP',  (SELECT id FROM public.classes WHERE sort_order = 13), 7, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Creative Arts & Design',     'CAD',   (SELECT id FROM public.classes WHERE sort_order = 13), 8, NOW()
UNION ALL
SELECT (SELECT id FROM public.schools LIMIT 1), 'Career Technology',          'CTECH', (SELECT id FROM public.classes WHERE sort_order = 13), 9, NOW()
;

-- =========================================================================
-- PART 5 - Seed subject_teacher_assignments
-- For every teacher-profile user, assign ALL subjects of the class they teach.
-- subject_teacher_assignments columns: id, subject_id, teacher_id (=>staff.id),
--                                      academic_year_id, term_id
-- =========================================================================

INSERT INTO public.subject_teacher_assignments (
  id,
  subject_id,
  teacher_id,
  academic_year_id,
  term_id
)
SELECT
  gen_random_uuid()                                          AS id,
  sub.id                                                     AS subject_id,
  s.id                                                       AS teacher_id,
  (SELECT id FROM public.academic_years WHERE label = '2026/2027' LIMIT 1)  AS academic_year_id,
  (SELECT id FROM public.terms WHERE is_current = true LIMIT 1)     AS term_id
FROM public.user_profiles up
JOIN public.staff s ON s.user_id = up.id
JOIN public.subjects sub ON sub.class_id = up.class_id
WHERE up.role = 'teacher'
  AND sub.class_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.subject_teacher_assignments sta
    WHERE sta.teacher_id = s.id
      AND sta.subject_id = sub.id
  );

-- =========================================================================
-- PART 6 - Ensure school_current_context has the active 2026/2027 + current term
-- =========================================================================

INSERT INTO public.school_current_context (school_id, academic_year_id, term_id, updated_at)
SELECT
  (SELECT id FROM public.schools LIMIT 1),
  (SELECT id FROM public.academic_years WHERE label = '2026/2027' LIMIT 1),
  (SELECT id FROM public.terms WHERE is_current = true LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.school_current_context);

-- If context exists but points to empty/null year/term, fix it
UPDATE public.school_current_context
SET
  academic_year_id = (SELECT id FROM public.academic_years WHERE label = '2026/2027' LIMIT 1),
  term_id          = (SELECT id FROM public.terms WHERE is_current = true LIMIT 1),
  updated_at       = NOW()
WHERE academic_year_id IS NULL OR term_id IS NULL;
