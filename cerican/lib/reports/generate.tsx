// lib/reports/generate.ts
// Create report version snapshots for a class and term

import { createServerClient } from '@/lib/supabase/server'
import { resolveReportSettings } from './settings'
import { getBulkAttendanceSummaries } from '@/lib/attendance/service'

export async function generateReportsForClassTerm(classId: string, termId: string, generatedBy?: string) {
  const supabase = createServerClient()
  const summary: { total: number; snapshots: number; errors: any[] } = { total: 0, snapshots: 0, errors: [] }

  // Load student_reports for class & term
  const { data: reports, error: fetchErr } = await supabase
    .from('student_reports')
    .select('*')
    .eq('class_id', classId)
    .eq('term_id', termId)

  if (fetchErr) throw new Error(fetchErr.message)
  if (!reports || reports.length === 0) return summary

  summary.total = reports.length

  const studentIds = reports.map((r: { student_id: string }) => r.student_id)
  const attendanceMap = await getBulkAttendanceSummaries(studentIds, termId, classId)

  for (const r of reports) {
    try {
      // Resolve settings
      const settings = await resolveReportSettings({ schoolId: r.school_id ?? null, classId: r.class_id, termId })

      // Fetch scores snapshot
      const { data: scores } = await supabase
        .from('scores')
        .select('subject_id, class_score, exam_score, total_score, grade, subject_remark')
        .eq('student_id', r.student_id)
        .eq('term_id', termId)

      // Fetch remark snapshot: prefer APPROVED, else latest GENERATED
      const { data: approved } = await supabase
        .from('remark_generation_log')
        .select('*')
        .eq('student_report_id', r.id)
        .eq('status', 'APPROVED')

      let remarkSnapshot: any = null
      if (approved && approved.length > 0) {
        remarkSnapshot = approved.reduce((acc: any, cur: any) => {
          acc[cur.remark_type] = cur.final_text ?? cur.generated_text
          return acc
        }, {})
      } else {
        const { data: generated } = await supabase
          .from('remark_generation_log')
          .select('*')
          .eq('student_report_id', r.id)
          .eq('source', 'SYSTEM_GENERATED')
          .order('created_at', { ascending: false })

        if (generated && generated.length > 0) {
          remarkSnapshot = generated.reduce((acc: any, cur: any) => {
            acc[cur.remark_type] = cur.generated_text
            return acc
          }, {})
        }
      }

      const att = attendanceMap.get(r.student_id) ?? { days_present: 0, total_days: 0, pct: 0 }

      const { error: updateErr } = await supabase
        .from('student_reports')
        .update({
          attendance_days_present: att.days_present,
          total_school_days: att.total_days,
        })
        .eq('id', r.id)

      if (updateErr) {
        summary.errors.push({ report_id: r.id, error: updateErr.message })
        continue
      }

      // Create version record
      const snapshot = {
        score_snapshot: scores ?? [],
        remark_snapshot: remarkSnapshot ?? {},
        settings_snapshot: settings,
      }

      // Determine next version number for this report
      const { data: versions } = await supabase
        .from('report_versions')
        .select('version_number')
        .eq('report_id', r.id)
        .order('version_number', { ascending: false })
        .limit(1)

      const nextVersion = (versions && versions[0] && versions[0].version_number + 1) || 1

      const { error: insErr } = await supabase.from('report_versions').insert([
        {
          report_id: r.id,
          version_number: nextVersion,
          score_snapshot: snapshot.score_snapshot,
          remark_snapshot: snapshot.remark_snapshot,
          settings_snapshot: snapshot.settings_snapshot,
          generated_by: generatedBy || null,
        },
      ])

      if (insErr) {
        summary.errors.push({ report_id: r.id, error: insErr.message })
      } else {
        summary.snapshots += 1
      }
    } catch (err: any) {
      summary.errors.push({ report_id: r.id, error: err.message ?? String(err) })
    }
  }

  return summary
}
