import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import OrderOfMeritPDF from '@/lib/reports/OrderOfMeritPDF'
import { pdf } from '@react-pdf/renderer'
import React from 'react'
import { pdfOutputToBytes } from '@/lib/reports/pdf-bytes'

export async function GET(req: Request, { params }: { params: { classId: string; termId: string } }) {
  try {
    const supabase = createServerClient()
    const { classId, termId } = params

    const { data: reports, error } = await supabase
      .from('student_reports')
      .select('id, student_id, total_score, aggregate, overall_position, out_of, students(first_name, surname)')
      .eq('class_id', classId)
      .eq('term_id', termId)
      .not('aggregate', 'is', null)
      .order('aggregate', { ascending: false })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    const rows = (reports || []).map((r: any) => ({
      student_id: r.student_id,
      name: r.students ? `${r.students.first_name} ${r.students.surname}` : undefined,
      aggregate: r.aggregate,
      out_of: r.out_of,
    }))

    const doc = React.createElement(OrderOfMeritPDF, {
      rows,
      className: `Class ${classId}`,
      termName: `Term ${termId}`,
      schoolName: undefined,
    })
    const asPdf = pdf()
    asPdf.updateContainer(doc)
    const buffer = await pdfOutputToBytes(await asPdf.toBuffer())

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="order-of-merit-${classId}-${termId}.pdf"` },
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message ?? String(err) }, { status: 500 })
  }
}
