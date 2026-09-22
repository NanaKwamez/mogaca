// app/api/remarks/report/[reportId]/approve/route.ts
// POST: approve a remark generation log entry (set status=APPROVED)

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: { reportId: string } }) {
  try {
    const supabase = createServerClient()
    const body = await req.json().catch(() => ({}))
    const { remark_type, final_text } = body
    if (!remark_type) return NextResponse.json({ ok: false, error: 'remark_type required' }, { status: 400 })

    // Find the latest generated entry for this report and type
    const { data: logs, error: fetchErr } = await supabase
      .from('remark_generation_log')
      .select('*')
      .eq('student_report_id', params.reportId)
      .eq('remark_type', remark_type)
      .order('created_at', { ascending: false })
      .limit(1)

    if (fetchErr) return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 500 })
    if (!logs || logs.length === 0) return NextResponse.json({ ok: false, error: 'No remark found to approve' }, { status: 404 })

    const log = logs[0]

    const updates: any = { status: 'APPROVED', edited_at: new Date().toISOString() }
    if (typeof final_text === 'string') {
      updates.final_text = final_text
      updates.was_edited = true
    }

    const { data, error } = await supabase
      .from('remark_generation_log')
      .update(updates)
      .eq('id', log.id)

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, approved: data })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message ?? String(err) }, { status: 500 })
  }
}
