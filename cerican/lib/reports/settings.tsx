// lib/reports/settings.ts
// resolveReportSettings({ schoolId, classId, termId })

import { createServerClient } from '@/lib/supabase/server'

export async function resolveReportSettings({ schoolId, classId, termId }: { schoolId?: string; classId?: string | null; termId?: string | null }) {
  const supabase = createServerClient()

  // 1. System defaults (hardcoded safe defaults)
  const defaults = {
    use_new_ges_format: false,
    show_aggregate: true,
    show_raw_score: true,
    show_overall_position: true,
    show_subject_code: false,
    show_raw_class_score: true,
    show_raw_exam_score: true,
    show_grades_column: true,
    show_subject_remarks: true,
    show_subject_position: false,
    show_signature: true,
    show_grading_schema: true,
    auto_headteacher_remarks: true,
    auto_class_teacher_remarks: true,
    remarks_tone: 'professional_warm',
    max_remark_chars: 200,
    aggregate_rule_id: null,
  }

  // 2. School defaults
  const { data: schoolSettings } = await supabase
    .from('report_settings')
    .select('*')
    .eq('school_id', schoolId)
    .is('class_id', null)
    .is('term_id', null)
    .limit(1)

  const school = (schoolSettings && schoolSettings[0]) || {}

  // 3. Class override
  const { data: classSettings } = await supabase
    .from('report_settings')
    .select('*')
    .eq('school_id', schoolId)
    .eq('class_id', classId)
    .is('term_id', null)
    .limit(1)

  const cls = (classSettings && classSettings[0]) || {}

  // 4. Term-specific override
  const { data: termSettings } = await supabase
    .from('report_settings')
    .select('*')
    .eq('school_id', schoolId)
    .eq('class_id', classId)
    .eq('term_id', termId)
    .limit(1)

  const term = (termSettings && termSettings[0]) || {}

  // Merge precedence: defaults < school < class < term
  const merged = { ...defaults, ...school, ...cls, ...term }
  return merged
}
