// app/api/reports/publish/[reportId]/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: { reportId: string } }) {
  try {
    const supabase = createServerClient()
    const { data: user, error: uErr } = await supabase.auth.getUser()
    if (uErr || !user?.user) return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 })

    const reportId = params.reportId

    // Fetch report
    const { data: report, error: rErr } = await supabase.from('student_reports').select('*').eq('id', reportId).single()
    if (rErr || !report) return NextResponse.json({ ok: false, error: 'Report not found' }, { status: 404 })

    const termId = report.term_id

    // Fetch scores
    const { data: scores } = await supabase
      .from('scores')
      .select('subject_id, class_score, exam_score, total_score, grade, subject_remark')
      .eq('student_id', report.student_id)
      .eq('term_id', termId)

    // Fetch remark snapshot: prefer APPROVED, else latest GENERATED
    const { data: approved } = await supabase
      .from('remark_generation_log')
      .select('*')
      .eq('student_report_id', reportId)
      .eq('status', 'APPROVED')

    let remarkSnapshot: any = {}
    if (approved && approved.length > 0) {
      for (const a of approved) remarkSnapshot[a.remark_type] = a.final_text ?? a.generated_text
    } else {
      const { data: generated } = await supabase
        .from('remark_generation_log')
        .select('*')
        .eq('student_report_id', reportId)
        .eq('source', 'SYSTEM_GENERATED')
        .order('created_at', { ascending: false })

      if (generated && generated.length > 0) {
        for (const g of generated) remarkSnapshot[g.remark_type] = g.generated_text
      }
    }

    // Resolve settings snapshot
    const { data: settings } = await supabase
      .from('report_settings')
      .select('*')
      .eq('class_id', report.class_id)
      .limit(1)

    const settingsSnapshot = (settings && settings[0]) || {}

    // Determine next version number
    const { data: versions } = await supabase
      .from('report_versions')
      .select('version_number')
      .eq('report_id', reportId)
      .order('version_number', { ascending: false })
      .limit(1)

    const nextVersion = (versions && versions[0] && versions[0].version_number + 1) || 1

    // Use lib helper to publish (generate PDF, create version, update report, notifications)
    try {
      const { publishReport } = await import('@/lib/reports/publish')
      const result = await publishReport(reportId, user.user.id)
      return NextResponse.json({ ok: true, published: true, pdfUrl: result.pdfUrl })
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 500 })
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message ?? String(err) }, { status: 500 })
  }
}
