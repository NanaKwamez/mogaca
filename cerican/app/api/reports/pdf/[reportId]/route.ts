// app/api/reports/pdf/[reportId]/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import React from 'react'
import { ReportCardPDF } from '@/lib/reports/ReportCard'
import { pdf } from '@react-pdf/renderer'
import { pdfOutputToBytes } from '@/lib/reports/pdf-bytes'

export async function GET(req: Request, { params }: { params: { reportId: string } }) {
  try {
    const supabase = createServerClient()
    const reportId = params.reportId

    // Fetch latest report_version for this report
    const { data: versions } = await supabase
      .from('report_versions')
      .select('*')
      .eq('report_id', reportId)
      .order('generated_at', { ascending: false })
      .limit(1)

    if (!versions || versions.length === 0) return NextResponse.json({ ok: false, error: 'No report version found' }, { status: 404 })

    const version = versions[0]

    // Fetch student and report metadata
    const { data: reportData } = await supabase
      .from('student_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    const { data: studentRes } = await supabase.from('students').select('first_name, surname').eq('id', reportData.student_id).single()

    // Enrich scores with subject names
    const scoreSnapshot = version.score_snapshot || []
    const subjectIds = (scoreSnapshot || []).map((s: any) => s.subject_id)
    const { data: subjects } = await supabase.from('subjects').select('id, name').in('id', subjectIds)
    const subjMap = new Map((subjects || []).map((s: any) => [s.id, s.name]))

    const scores = (scoreSnapshot || []).map((s: any) => ({ ...s, subject_name: subjMap.get(s.subject_id) }))

    const settings = version.settings_snapshot || {}

    const doc = React.createElement(ReportCardPDF, {
      student: studentRes ?? {},
      report: reportData,
      scores,
      settings,
    })

    const asPdf = pdf()
    asPdf.updateContainer(doc)
    const buffer = await pdfOutputToBytes(await asPdf.toBuffer())

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf', 'Content-Length': String(buffer.length) },
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message ?? String(err) }, { status: 500 })
  }
}
