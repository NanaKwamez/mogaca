// app/api/reports/order-of-merit/[classId]/[termId]/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: Request, { params }: { params: { classId: string; termId: string } }) {
  try {
    const supabase = createServerClient()
    const { classId, termId } = params

    const { data: reports, error } = await supabase
      .from('student_reports')
      .select('id, student_id, total_score, aggregate, overall_position, out_of')
      .eq('class_id', classId)
      .eq('term_id', termId)
      .not('aggregate', 'is', null)
      .order('aggregate', { ascending: false })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    // Compute deterministic tie-breaker: higher total_score, then lower overall_position
    const sorted = (reports || []).sort((a: any, b: any) => {
      if (b.aggregate !== a.aggregate) return (b.aggregate ?? 0) - (a.aggregate ?? 0)
      if ((b.total_score ?? 0) !== (a.total_score ?? 0)) return (b.total_score ?? 0) - (a.total_score ?? 0)
      return (a.overall_position ?? 9999) - (b.overall_position ?? 9999)
    })

    return NextResponse.json({ ok: true, reports: sorted })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message ?? String(err) }, { status: 500 })
  }
}
