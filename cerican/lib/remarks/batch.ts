// lib/remarks/batch.ts
// Batch generation runner for deterministic remarks

import { createServerClient } from '@/lib/supabase/server'
import { generateRemark } from './generate'

export interface BatchSummary {
  total: number
  generated: number
  skipped_already_generated_or_approved: number
  manual_review_required: number
  errors: { student_report_id: string; error: string }[]
}

export async function generateRemarksForClassTerm(classId: string, termId: string, generatedBy?: string): Promise<BatchSummary> {
  const supabase = createServerClient()
  const summary: BatchSummary = { total: 0, generated: 0, skipped_already_generated_or_approved: 0, manual_review_required: 0, errors: [] }

  // Load student reports for the class and term
  const { data: reports, error: fetchErr } = await supabase
    .from('student_reports')
    .select('*')
    .eq('class_id', classId)
    .eq('term_id', termId)

  if (fetchErr) throw new Error(fetchErr.message)
  if (!reports || reports.length === 0) return summary

  summary.total = reports.length

  for (const r of reports) {
    try {
      // For idempotency: check existing generation log for this report and remark types
      const { data: existingLogs } = await supabase
        .from('remark_generation_log')
        .select('*')
        .eq('student_report_id', r.id)

      // If there is any APPROVED remark for either type, skip generation for that type
      const hasApproved = existingLogs && existingLogs.some((l: any) => l.status === 'APPROVED')
      if (hasApproved) {
        summary.skipped_already_generated_or_approved += 1
        continue
      }

      // Load student record to build a richer profile for rendering
      const { data: student } = await supabase
        .from('students')
        .select('first_name, gender, division')
        .eq('id', r.student_id)
        .single()

      // Build a minimal profile expected by generateRemark
      const profile = {
        id: r.student_id,
        first_name: student?.first_name ?? '',
        gender: (student?.gender as any) ?? 'Other',
        division: student?.division ?? null,
        prev_pos: null,
        cur_pos: r.overall_position ?? null,
        total_students: r.out_of ?? null,
        attendance_pct: r.total_school_days ? ((r.attendance_days_present || 0) / r.total_school_days) * 100 : null,
      }

      // Attempt generation for headteacher and class_teacher depending on settings; default both
      const types: ('headteacher' | 'class_teacher')[] = ['headteacher', 'class_teacher']

      for (const t of types) {
        // Skip if an APPROVED entry exists for this report+type
        const hasApprovedForType = existingLogs && existingLogs.some((l: any) => l.remark_type === t && l.status === 'APPROVED')
        if (hasApprovedForType) continue

        // Skip if a GENERATED SYSTEM_GENERATED entry already exists (idempotent)
        const hasGeneratedForType = existingLogs && existingLogs.some((l: any) => l.remark_type === t && l.status === 'GENERATED' && l.source === 'SYSTEM_GENERATED')
        if (hasGeneratedForType) {
          summary.skipped_already_generated_or_approved += 1
          continue
        }

        const result = await generateRemark(profile as any, t, termId)
        if (result.status === 'GENERATED') {
          // Insert into remark_generation_log
          const { error: insErr } = await supabase.from('remark_generation_log').insert([
            {
              student_report_id: r.id,
              remark_type: t,
              primary_pattern_key: result.primaryKey,
              secondary_pattern_key: result.secondaryKey,
              primary_template_id: result.primaryTemplateId,
              secondary_template_id: result.secondaryTemplateId,
              primary_variant_index: null,
              secondary_variant_index: null,
              template_version_snapshot: null,
              generated_text: result.remark,
              final_text: null,
              status: 'GENERATED',
              source: 'SYSTEM_GENERATED',
              was_edited: false,
              generated_by: generatedBy,
            },
          ])

          if (insErr) {
            summary.errors.push({ student_report_id: r.id, error: insErr.message })
          } else {
            summary.generated += 1
          }
        } else if (result.status === 'MANUAL_REVIEW_REQUIRED') {
          summary.manual_review_required += 1
          // Log the manual review required state
          await supabase.from('remark_generation_log').insert([
            {
              student_report_id: r.id,
              remark_type: t,
              primary_pattern_key: result.primaryKey ?? null,
              secondary_pattern_key: result.secondaryKey ?? null,
              generated_text: result.remark ?? null,
              status: 'MANUAL_REVIEW_REQUIRED',
              source: 'SYSTEM_GENERATED',
              was_edited: false,
              generated_by: generatedBy,
            },
          ])
        }
      }
    } catch (err: any) {
      summary.errors.push({ student_report_id: r.id, error: err.message ?? String(err) })
    }
  }

  return summary
}
