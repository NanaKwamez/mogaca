// lib/reports/publish.ts
// Publish a student report: create version, generate PDF into public/, update report status, and queue notifications

import { createServerClient } from '@/lib/supabase/server'
import { ReportCardPDF } from './ReportCard'
import { pdf } from '@react-pdf/renderer'
import fs from 'fs'
import path from 'path'
import { pdfOutputToBytes } from './pdf-bytes'

export async function publishReport(reportId: string, publishedBy: string | null) {
  const supabase = createServerClient()

  // Fetch report
  const { data: report, error: rErr } = await supabase.from('student_reports').select('*').eq('id', reportId).single()
  if (rErr || !report) throw new Error('Report not found')

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

  // Resolve settings snapshot (use class-level settings if present)
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

  // Prepare snapshot object
  const snapshot = {
    score_snapshot: scores ?? [],
    remark_snapshot: remarkSnapshot,
    settings_snapshot: settingsSnapshot,
  }

  // Insert version record first
  const { data: insData, error: insErr } = await supabase.from('report_versions').insert([
    {
      report_id: reportId,
      version_number: nextVersion,
      score_snapshot: snapshot.score_snapshot,
      remark_snapshot: snapshot.remark_snapshot,
      settings_snapshot: snapshot.settings_snapshot,
      generated_by: publishedBy || null,
    },
  ])

  if (insErr) throw new Error('Failed to create report version: ' + insErr.message)

  // Generate PDF buffer using ReportCardPDF
  // Fetch student
  const { data: studentRes } = await supabase.from('students').select('first_name, surname').eq('id', report.student_id).single()

  const student = (studentRes && studentRes) || {}
  const settingsForPdf = settingsSnapshot || {}

  const doc = <ReportCardPDF student={student} report={report} scores={(scores || [])} settings={settingsForPdf} />
  const asPdf = pdf()
  asPdf.updateContainer(doc)
  const buffer = await pdfOutputToBytes(await asPdf.toBuffer())

  // Write buffer to public/reports/<reportId>.pdf so it is accessible at /reports/<reportId>.pdf
  const publicDir = path.join(process.cwd(), 'public', 'reports')
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true })
  const outPath = path.join(publicDir, `${reportId}.pdf`)
  fs.writeFileSync(outPath, buffer)

  const pdfUrl = `/reports/${reportId}.pdf`

  // Update the report_versions entry with pdf_url
  const { error: updVerErr } = await supabase
    .from('report_versions')
    .update({ pdf_url: pdfUrl })
    .eq('report_id', reportId)
    .eq('version_number', nextVersion)

  if (updVerErr) throw new Error('Failed to update report version with pdf_url: ' + updVerErr.message)

  // Update report status to PUBLISHED and set published_at
  const { error: pubErr } = await supabase
    .from('student_reports')
    .update({ status: 'PUBLISHED', published_at: new Date().toISOString() })
    .eq('id', reportId)

  if (pubErr) throw new Error('Failed to update student_report: ' + pubErr.message)

  // Create notifications for student and guardians
  // Student notification
  await supabase.from('notifications').insert([
    {
      school_id: report.school_id,
      recipient_type: 'student',
      recipient_id: report.student_id,
      title: 'Report published',
      body: `Your report for term ${termId} is now published.`,
      channel: 'in_app',
      reference_type: 'student_report',
      reference_id: reportId,
      sent_at: new Date().toISOString(),
    },
  ])

  // Parent/guardian notifications
  const { data: guardians } = await supabase
    .from('student_guardians')
    .select('guardian_id')
    .eq('student_id', report.student_id)

  if (guardians && guardians.length > 0) {
    const notifs = guardians.map((g: any) => ({
      school_id: report.school_id,
      recipient_type: 'parent',
      recipient_id: g.guardian_id,
      title: 'Child report published',
      body: `A report for your child has been published for term ${termId}.`,
      channel: 'in_app',
      reference_type: 'student_report',
      reference_id: reportId,
      sent_at: new Date().toISOString(),
    }))

    await supabase.from('notifications').insert(notifs)
  }

  return { pdfUrl, version: nextVersion }
}
